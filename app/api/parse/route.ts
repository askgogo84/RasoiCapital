// app/api/parse/route.ts
// POST multipart/form-data:
//   file: PDF · doc_type: bank_statement|zomato_payout|swiggy_payout
//   outlet_name: string · application_id?: uuid
// Uploads to Supabase Storage (uw-docs), parses via Claude vision,
// persists structured rows. Returns document id, status, confidence, counts.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
import { parseBankStatement } from "@/lib/parsers/bankStatement";
import { parsePlatformPayout } from "@/lib/parsers/platformPayout";

export const runtime = "nodejs";
export const maxDuration = 300; // Vercel: requires plan supporting long functions; else lower

const MAX_BYTES = 25 * 1024 * 1024;
const CONFIDENCE_FLOOR = 0.7;

// Accepted payout rails → their platform tag. "other_payout" carries a free-text
// platform_label. All are reconciled together (pooled) against the bank statement.
const PAYOUT_PLATFORM: Record<string, string> = {
  zomato_payout: "zomato",
  swiggy_payout: "swiggy",
  ondc_payout: "ondc",
  ownly_payout: "ownly",
  magicpin_payout: "magicpin",
  other_payout: "other",
};
const VALID_DOC_TYPES = ["bank_statement", ...Object.keys(PAYOUT_PLATFORM)];

export async function POST(req: NextRequest) {
  let docId: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const docType = String(form.get("doc_type") ?? "");
    const outletName = String(form.get("outlet_name") ?? "").trim();
    const applicationId = (form.get("application_id") as string) || null;
    const platformLabel = String(form.get("platform_label") ?? "").trim();

    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (!VALID_DOC_TYPES.includes(docType))
      return NextResponse.json({ error: "invalid doc_type" }, { status: 400 });
    if (!outletName) return NextResponse.json({ error: "outlet_name is required" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "file too large (max 25MB)" }, { status: 413 });
    if (file.type && file.type !== "application/pdf")
      return NextResponse.json({ error: "only PDF accepted" }, { status: 415 });

    const buf = Buffer.from(await file.arrayBuffer());
    const storagePath = `${outletName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}/${Date.now()}_${docType}.pdf`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("uw-docs")
      .upload(storagePath, buf, { contentType: "application/pdf" });
    if (upErr) throw new Error(`storage upload failed: ${upErr.message}`);

    const { data: doc, error: insErr } = await supabaseAdmin
      .from("uw_documents")
      .insert({
        application_id: applicationId,
        outlet_name: outletName,
        doc_type: docType,
        storage_path: storagePath,
        parse_status: "parsing",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(`uw_documents insert failed: ${insErr.message}`);
    docId = doc.id;

    const pdfBase64 = buf.toString("base64");

    if (docType === "bank_statement") {
      const result = await parseBankStatement(pdfBase64);
      const status = result.confidence >= CONFIDENCE_FLOOR && result.transactions.length > 0 ? "parsed" : "failed";

      if (result.transactions.length > 0) {
        const rows = result.transactions.map((t) => ({
          document_id: docId,
          txn_date: t.date,
          description: t.description,
          amount: t.amount,
          direction: t.direction,
          category: t.category,
          confidence: result.confidence,
        }));
        // chunked insert — statements can run 1000+ rows
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabaseAdmin.from("uw_bank_txns").insert(rows.slice(i, i + 500));
          if (error) throw new Error(`uw_bank_txns insert failed: ${error.message}`);
        }
      }

      await supabaseAdmin
        .from("uw_documents")
        .update({ parse_status: status, parse_confidence: result.confidence, parsed_json: result })
        .eq("id", docId);

      return NextResponse.json({
        document_id: docId,
        status,
        confidence: result.confidence,
        txn_count: result.transactions.length,
        period: result.statement_period,
        manual_fallback: status === "failed",
      });
    }

    // payout docs — platform tag comes from the chosen slot; "other" carries a
    // free-text label. This tag is authoritative when the PDF is ambiguous.
    const basePlatform = PAYOUT_PLATFORM[docType] ?? "other";
    const expected =
      docType === "other_payout" && platformLabel
        ? platformLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
        : basePlatform;
    const result = await parsePlatformPayout(pdfBase64, expected);
    const status = result.confidence >= CONFIDENCE_FLOOR && result.settlements.length > 0 ? "parsed" : "failed";

    if (result.settlements.length > 0) {
      const rows = result.settlements.map((s) => ({
        document_id: docId,
        platform: result.platform === "unknown" ? expected : result.platform,
        period_start: s.period_start,
        period_end: s.period_end,
        gross_sales: s.gross_sales,
        commission: s.commission,
        ads: s.ads,
        promos: s.promos,
        taxes: s.taxes,
        net_payout: s.net_payout,
        confidence: result.confidence,
      }));
      const { error } = await supabaseAdmin.from("uw_payouts").insert(rows);
      if (error) throw new Error(`uw_payouts insert failed: ${error.message}`);
    }

    await supabaseAdmin
      .from("uw_documents")
      .update({ parse_status: status, parse_confidence: result.confidence, parsed_json: result })
      .eq("id", docId);

    return NextResponse.json({
      document_id: docId,
      status,
      confidence: result.confidence,
      settlement_count: result.settlements.length,
      platform: result.platform,
      outlet_name_on_doc: result.outlet_name,
      manual_fallback: status === "failed",
    });
  } catch (err: any) {
    console.error("parse route error:", err?.message);
    if (docId) {
      await supabaseAdmin
        .from("uw_documents")
        .update({ parse_status: "failed", error_message: String(err?.message ?? err) })
        .eq("id", docId);
    }
    return NextResponse.json(
      { error: "parse failed", detail: String(err?.message ?? err), document_id: docId, manual_fallback: true },
      { status: 500 }
    );
  }
}
