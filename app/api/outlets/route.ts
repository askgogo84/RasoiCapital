// app/api/outlets/route.ts
// GET → returns the list of outlets for the underwrite picker dropdown.
// Includes seeded demo outlets + any real ones. Ordered by name.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("outlets")
      .select("id, outlet_name, city, outlet_category, location_type_code, google_maps_rating, google_review_count")
      .order("outlet_name", { ascending: true });
    if (error) throw new Error(error.message);

    // Also surface outlet names that have parsed underwriting docs but may not yet
    // be full outlet rows (e.g. Green Leaf Cafe, Spice Garden used in the flow).
    const { data: docOutlets } = await supabaseAdmin
      .from("uw_documents")
      .select("outlet_name")
      .eq("parse_status", "parsed");

    const outletNames = new Set((data ?? []).map((o) => o.outlet_name));
    const extras = Array.from(new Set((docOutlets ?? []).map((d) => d.outlet_name)))
      .filter((n) => !outletNames.has(n))
      .map((n) => ({ id: null, outlet_name: n, city: "Bengaluru", outlet_category: null,
                     location_type_code: null, google_maps_rating: null, google_review_count: null }));

    return NextResponse.json({ outlets: [...(data ?? []), ...extras] });
  } catch (err: any) {
    return NextResponse.json({ error: "outlets fetch failed", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
