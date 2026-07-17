// app/api/docs-status/route.ts
// GET ?outlet_name=... → returns which doc types are already parsed for this outlet,
// so the flow can let an analyst resume without re-uploading (and avoid double-parsing).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const outlet = (req.nextUrl.searchParams.get("outlet_name") ?? "").trim();
    if (!outlet) return NextResponse.json({ error: "outlet_name required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("uw_documents")
      .select("doc_type, parse_status, parse_confidence, created_at")
      .eq("outlet_name", outlet)
      .eq("parse_status", "parsed")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // most recent parsed doc per type
    const byType: Record<string, any> = {};
    for (const d of data ?? []) {
      if (!byType[d.doc_type]) byType[d.doc_type] = d;
    }
    return NextResponse.json({
      outlet_name: outlet,
      existing: Object.entries(byType).map(([doc_type, d]: any) => ({
        doc_type,
        confidence: d.parse_confidence,
        parsed_at: d.created_at,
      })),
      has_any: Object.keys(byType).length > 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "docs-status failed", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
