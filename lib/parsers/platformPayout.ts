// lib/parsers/platformPayout.ts
import Anthropic from "@anthropic-ai/sdk";
import { PAYOUT_PROMPT } from "./prompts";

export interface PayoutRecord {
  period_start: string | null;
  period_end: string | null;
  gross_sales: number | null;
  commission: number | null;
  ads: number | null;
  promos: number | null;
  taxes: number | null;
  net_payout: number;
  payout_date: string | null;
}

export interface PayoutParseResult {
  platform: string;             // zomato | swiggy | ondc | ownly | magicpin | <other> | unknown
  outlet_name: string | null;
  settlements: PayoutRecord[];
  confidence: number;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function parsePlatformPayout(
  pdfBase64: string,
  expectedPlatform?: string
): Promise<PayoutParseResult> {
  const resp = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: PAYOUT_PROMPT },
        ],
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const raw = extractJson(text);
  // Accept any non-empty platform the model reports; otherwise fall back to the
  // upload's platform tag (authoritative when the document is ambiguous).
  let platform: string =
    typeof raw.platform === "string" && raw.platform && raw.platform !== "unknown"
      ? raw.platform
      : "unknown";
  if (platform === "unknown" && expectedPlatform) platform = expectedPlatform;

  const settlements: PayoutRecord[] = (raw.settlements ?? [])
    .filter((s: any) => typeof s?.net_payout === "number" && s.net_payout > 0)
    .map((s: any) => ({
      period_start: s.period_start ?? null,
      period_end: s.period_end ?? null,
      gross_sales: numOrNull(s.gross_sales),
      commission: numOrNull(s.commission),
      ads: numOrNull(s.ads),
      promos: numOrNull(s.promos),
      taxes: numOrNull(s.taxes),
      net_payout: s.net_payout,
      payout_date: s.payout_date ?? null,
    }));

  return {
    platform,
    outlet_name: raw.outlet_name ?? null,
    settlements,
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
  };
}

function numOrNull(v: any): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}
