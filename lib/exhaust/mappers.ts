// lib/exhaust/mappers.ts
// Map enrichment signals onto Rasoi's existing 1–5 factor scores.
// These are the SAME score dimensions lib/scoring.ts already uses; we just derive the
// inputs from data instead of asking the analyst.
import type { OutletEnrichment } from "./provider";

// --- Ambience: from Google-style rating + review depth ---
// Maps a rating (with a small confidence nudge from review count) to pos/avg counts
// compatible with scoreAmbience(pos, avg).
export function mapAmbience(e: OutletEnrichment): { pos: number; avg: number; rating: number | null; basis: string } {
  const r = e.rating ?? 0;
  const enoughReviews = (e.review_count ?? 0) >= 50; // thin review base = lower confidence
  let pos = 0, avg = 0;
  if (r >= 4.5 && enoughReviews) { pos = 3; avg = 0; }        // → ambience score 5
  else if (r >= 4.2) { pos = 2; avg = 1; }                    // → 4
  else if (r >= 3.9) { pos = 1; avg = 2; }                    // → 3
  else if (r >= 3.5) { pos = 0; avg = 3; }                    // → 2
  else { pos = 0; avg = 0; }                                  // → 1
  return { pos, avg, rating: e.rating, basis: `rating ${r}★ over ${e.review_count ?? 0} reviews` };
}

// --- Menu category: from price level / price-for-two ---
// Rasoi categories A/B/C/D map to margin bands. Higher price point → higher category
// (more pricing headroom → better margin), matching Boi's ₹100-vs-₹300 momo insight.
export function mapMenuCategory(e: OutletEnrichment): { category: "A" | "B" | "C" | "D"; basis: string } {
  const pl = e.price_level ?? 0;
  const p2 = e.price_for_two ?? 0;
  let category: "A" | "B" | "C" | "D";
  if (pl >= 4 || p2 >= 1500) category = "A";
  else if (pl === 3 || p2 >= 900) category = "B";
  else if (pl === 2 || p2 >= 500) category = "C";
  else category = "D";
  return { category, basis: p2 ? `price-for-two ≈ ₹${p2}` : `price level ${pl}/4` };
}

// --- Location: from nearby footfall-driving POIs ---
// Weight POI types by how much they drive HORECA footfall, sum within 1km,
// map to Rasoi location codes A(best)..E(worst).
const POI_WEIGHTS: Record<string, number> = {
  tech_park: 3, mall: 3, college: 2.5, metro: 2, office: 2, hospital: 1.5, other: 0.5,
};
export function mapLocation(e: OutletEnrichment): { code: "A" | "B" | "C" | "D" | "E"; score: number; basis: string } {
  let raw = 0;
  const named: string[] = [];
  for (const poi of e.nearby ?? []) {
    if (poi.distance_m > 1000) continue;
    // closer POIs count more (linear falloff to 1km)
    const proximity = Math.max(0, 1 - poi.distance_m / 1000);
    raw += (POI_WEIGHTS[poi.type] ?? 0.5) * (0.5 + 0.5 * proximity);
    named.push(`${poi.name} (${poi.distance_m}m)`);
  }
  let code: "A" | "B" | "C" | "D" | "E";
  if (raw >= 9) code = "A";
  else if (raw >= 6) code = "B";
  else if (raw >= 4) code = "C";
  else if (raw >= 2) code = "D";
  else code = "E";
  return { code, score: Math.round(raw * 10) / 10, basis: named.slice(0, 4).join(", ") || "no notable POIs within 1km" };
}
