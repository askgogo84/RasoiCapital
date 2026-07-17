// lib/exhaust/mockProvider.ts
// Deterministic mock enrichment — same shape the real Google Places provider will return.
// Values are seeded off the outlet name so the same outlet always returns the same data
// (stable demos). CLEARLY labeled source:"mock" so the UI can badge it MOCK.
import type { EnrichmentProvider, EnrichmentQuery, OutletEnrichment, NearbyPOI } from "./provider";

function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295; // 0..1
}

const POI_POOL: NearbyPOI[] = [
  { type: "tech_park", name: "Prestige Tech Park", distance_m: 380 },
  { type: "college", name: "Christ University", distance_m: 620 },
  { type: "mall", name: "Forum Mall", distance_m: 540 },
  { type: "metro", name: "Indiranagar Metro", distance_m: 450 },
  { type: "office", name: "WeWork Galaxy", distance_m: 300 },
  { type: "college", name: "St. Joseph's College", distance_m: 900 },
  { type: "hospital", name: "Manipal Hospital", distance_m: 700 },
];

export const MockProvider: EnrichmentProvider = {
  name: "mock",
  async enrich(q: EnrichmentQuery): Promise<OutletEnrichment> {
    const s = seedFromString(q.outletName.toLowerCase() + q.city.toLowerCase());
    const rating = Math.round((3.4 + s * 1.5) * 10) / 10;           // 3.4..4.9
    const review_count = Math.round(80 + s * 1200);                  // 80..1280
    const vintage_months = 12 + Math.round(s * 48);                  // 12..60
    const review_velocity = Math.round((review_count / vintage_months) * 10) / 10;
    const price_level = 1 + Math.round(s * 3);                       // 1..4
    const price_for_two = [300, 600, 1000, 1600][price_level - 1] ?? 600;
    // pick a stable subset of nearby POIs
    const n = 2 + Math.round(s * 3);                                 // 2..5 POIs
    const start = Math.floor(s * POI_POOL.length);
    const nearby = Array.from({ length: n }, (_, i) => POI_POOL[(start + i) % POI_POOL.length]);

    return {
      source: "mock",
      found: true,
      rating,
      review_count,
      review_velocity,
      price_level,
      price_for_two,
      nearby,
      address: `${q.outletName}, ${q.city}`,
      is_open: true,
    };
  },
};
