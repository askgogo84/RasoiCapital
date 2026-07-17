// app/api/exhaust/route.ts
// POST { outlet_name, city, zomato_url?, gmaps_url? }
// Runs the active enrichment provider (mock today) and maps signals to
// ambience / menu-category / location inputs for the 6-factor score.
// Persists a uw_exhaust_snapshots row. Everything labeled with its source.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MockProvider } from "@/lib/exhaust/mockProvider";
import { mapAmbience, mapMenuCategory, mapLocation } from "@/lib/exhaust/mappers";
import type { EnrichmentProvider } from "@/lib/exhaust/provider";

export const runtime = "nodejs";
export const maxDuration = 30;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── PROVIDER SWITCH ──────────────────────────────────────────────
// Today: MockProvider. When Google Places billing is live, replace this
// single line with `const provider = GooglePlacesProvider;` — nothing else changes.
const provider: EnrichmentProvider = MockProvider;
// ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const outletName = String(b.outlet_name ?? "").trim();
    const city = String(b.city ?? "").trim() || "Bengaluru";
    if (!outletName) return NextResponse.json({ error: "outlet_name is required" }, { status: 400 });

    const e = await provider.enrich({
      outletName, city, zomatoUrl: b.zomato_url, gmapsUrl: b.gmaps_url,
    });

    const ambience = mapAmbience(e);
    const menu = mapMenuCategory(e);
    const location = mapLocation(e);

    // Simple 1–5 pre-score from the three derived signals (equal weight for pre-visit screen).
    // Ambience rating band + location band + menu category band, normalized.
    const ambBand = e.rating ? Math.min(5, Math.max(1, Math.round(e.rating))) : 3;
    const locBand = { A: 5, B: 4, C: 3, D: 2, E: 1 }[location.code];
    const menuBand = { A: 5, B: 4, C: 3, D: 2 }[menu.category];
    const prescore = Math.round(((ambBand + locBand + menuBand) / 3) * 10) / 10;

    // Persist snapshot (best-effort)
    let snapshotId: string | null = null;
    try {
      const { data, error } = await supabaseAdmin
        .from("uw_exhaust_snapshots")
        .insert({
          outlet_name: outletName,
          zomato_url: b.zomato_url ?? null,
          gmaps_url: b.gmaps_url ?? null,
          rating: e.rating,
          rating_count: e.review_count,
          price_for_two: e.price_for_two,
          review_velocity: e.review_velocity,
          prescore,
          raw: { source: e.source, nearby: e.nearby, ambience, menu, location },
        })
        .select("id")
        .single();
      if (!error) snapshotId = data?.id ?? null;
    } catch { /* non-blocking */ }

    return NextResponse.json({
      snapshot_id: snapshotId,
      source: e.source,              // "mock" today — UI badges this
      found: e.found,
      signals: {
        rating: e.rating,
        review_count: e.review_count,
        review_velocity: e.review_velocity,
        price_for_two: e.price_for_two,
        nearby: e.nearby,
      },
      derived: {
        ambience: { pos: ambience.pos, avg: ambience.avg, basis: ambience.basis },
        menu_category: { category: menu.category, basis: menu.basis },
        location: { code: location.code, score: location.score, basis: location.basis },
      },
      prescore,
    });
  } catch (err: any) {
    console.error("exhaust route error:", err?.message);
    return NextResponse.json({ error: "exhaust failed", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
