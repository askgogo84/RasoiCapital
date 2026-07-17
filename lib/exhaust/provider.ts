// lib/exhaust/provider.ts
// Enrichment provider interface. ONE place decides where outlet data comes from.
// Today: mock. Later: swap MOCK_PROVIDER for a GooglePlacesProvider — nothing else changes.

export interface OutletEnrichment {
  source: "mock" | "google_places" | "manual";
  found: boolean;
  // ambience signals
  rating: number | null;            // 0..5
  review_count: number | null;
  review_velocity: number | null;   // reviews/month (approx)
  // menu / price signals
  price_level: number | null;       // 0..4 (Google style) OR derived band
  price_for_two: number | null;     // ₹, if available
  // location signals
  nearby: NearbyPOI[];              // colleges, malls, tech parks, metro, offices
  address: string | null;
  is_open: boolean | null;
}

export interface NearbyPOI {
  type: "college" | "mall" | "tech_park" | "metro" | "office" | "hospital" | "other";
  name: string;
  distance_m: number;
}

export interface EnrichmentQuery {
  outletName: string;
  city: string;
  zomatoUrl?: string;
  gmapsUrl?: string;
}

export interface EnrichmentProvider {
  name: string;
  enrich(q: EnrichmentQuery): Promise<OutletEnrichment>;
}
