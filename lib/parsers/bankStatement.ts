// lib/parsers/bankStatement.ts
// v2: chunked parsing — splits the PDF into 3-page chunks so each
// Claude response stays well under the output token limit, then merges.
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { BANK_STATEMENT_PROMPT } from "./prompts";

export interface BankTxn {
  date: string;
  description: string;
  amount: number;
  direction: "credit" | "debit";
  balance: number | null;
  category: string;
}

export interface BankParseResult {
  account_holder: string | null;
  bank_name: string | null;
  statement_period: { from: string | null; to: string | null };
  transactions: BankTxn[];
  confidence: number;
  chunks_parsed: number;
  chunks_failed: number;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PAGES_PER_CHUNK = 3;

export function classifyTxn(description: string, direction: "credit" | "debit"): string {
  if (direction === "debit") return "OTHER";
  const d = description.toUpperCase();
  if (/ZOMATO/.test(d)) return "ZOMATO_SETTLEMENT";
  if (/SWIGGY|BUNDL/.test(d)) return "SWIGGY_SETTLEMENT";
  if (/\bUPI\b|@OK|@YBL|@PAYTM|@IBL|BHIM/.test(d)) return "UPI";
  if (/POS |CARD|VISA|MASTERCARD|RUPAY|MSWIPE|PINELABS|RAZORPAY|PAYTM POS/.test(d)) return "CARD";
  if (/CASH DEP|CDM|CASH DEPOSIT|BY CASH/.test(d)) return "CASH_DEPOSIT";
  if (/NEFT|IMPS|RTGS|FT-|TRANSFER/.test(d)) return "TRANSFER_IN";
  return "OTHER";
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function splitPdf(pdfBase64: string): Promise<string[]> {
  const src = await PDFDocument.load(Buffer.from(pdfBase64, "base64"));
  const total = src.getPageCount();
  const chunks: string[] = [];
  for (let i = 0; i < total; i += PAGES_PER_CHUNK) {
    const out = await PDFDocument.create();
    const idxs = Array.from(
      { length: Math.min(PAGES_PER_CHUNK, total - i) },
      (_, k) => i + k
    );
    const pages = await out.copyPages(src, idxs);
    pages.forEach((p) => out.addPage(p));
    const bytes = await out.save();
    chunks.push(Buffer.from(bytes).toString("base64"));
  }
  return chunks;
}

async function parseChunk(chunkBase64: string, attempt = 1): Promise<any> {
  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: chunkBase64 },
            },
            { type: "text", text: BANK_STATEMENT_PROMPT },
          ],
        },
      ],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return extractJson(text);
  } catch (err) {
    if (attempt < 2) return parseChunk(chunkBase64, attempt + 1);
    throw err;
  }
}

export async function parseBankStatement(pdfBase64: string): Promise<BankParseResult> {
  const chunks = await splitPdf(pdfBase64);

  // Parse chunks with limited concurrency (2 at a time) for speed without rate-limit risk
  const results: (any | null)[] = new Array(chunks.length).fill(null);
  let failed = 0;
  const CONCURRENCY = 2;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY).map((c, k) =>
      parseChunk(c)
        .then((r) => { results[i + k] = r; })
        .catch(() => { failed++; })
    );
    await Promise.all(batch);
  }

  const transactions: BankTxn[] = [];
  let account_holder: string | null = null;
  let bank_name: string | null = null;
  let from: string | null = null;
  let to: string | null = null;
  const confidences: number[] = [];

  for (const raw of results) {
    if (!raw) continue;
    account_holder = account_holder ?? raw.account_holder ?? null;
    bank_name = bank_name ?? raw.bank_name ?? null;
    from = from ?? raw.statement_period?.from ?? null;
    if (raw.statement_period?.to) to = raw.statement_period.to;
    if (typeof raw.confidence === "number") confidences.push(raw.confidence);
    for (const t of raw.transactions ?? []) {
      if (!t?.date || typeof t.amount !== "number" || t.amount <= 0) continue;
      const direction = t.direction === "debit" ? "debit" : "credit";
      transactions.push({
        date: t.date,
        description: String(t.description ?? ""),
        amount: t.amount,
        direction,
        balance: typeof t.balance === "number" ? t.balance : null,
        category: classifyTxn(String(t.description ?? ""), direction),
      });
    }
  }

  // de-duplicate rows that appear on chunk boundaries (same date+amount+description)
  const seen = new Set<string>();
  const deduped = transactions.filter((t) => {
    const key = `${t.date}|${t.amount}|${t.direction}|${t.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => a.date.localeCompare(b.date));

  const avgConf = confidences.length
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;
  // penalize failed chunks proportionally — missing pages = missing months
  const chunkPenalty = chunks.length ? (chunks.length - failed) / chunks.length : 0;

  return {
    account_holder,
    bank_name,
    statement_period: { from, to },
    transactions: deduped,
    confidence: Math.round(avgConf * chunkPenalty * 100) / 100,
    chunks_parsed: chunks.length - failed,
    chunks_failed: failed,
  };
}
