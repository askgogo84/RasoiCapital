// lib/exhaust/googlePlacesProvider.ts
// REAL provider — Google Places API (New). NOT active until billing is set up and
// GOOGLE_PLACES_API_KEY is in the environment. When ready, in app/api/exhaust/route.ts
// change:  const provider = MockProvider;  →  const provider = GooglePlacesProvider;
//
// Uses: Text Search (find the outlet) + Place Details (rating, price) + Nearby Search
// (colleges/malls/tech parks). Returns the SAME OutletEnrichment shape as the mock.
import type { EnrichmentProvider, EnrichmentQuery, OutletEnrichment, NearbyPOI } from "./provider";

const KEY = process.env.GOOGLE_PLACES_API_KEY;

const POI_TYPE_MAP: Record<string, NearbyPOI["type"]> = {
  university: "college", college: "college", school: "college",
  shopping_mall: "mall", subway_station: "metro", transit_station: "metro",
  hospital: "hospital",
};

async function textSearch(q: string): Promise<any | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount,places.priceLevel,places.formattedAddress,places.location,places.currentOpeningHours.openNow",
    },
    body: JSON.stringify({ textQuery: q }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.places?.[0] ?? null;
}

async function nearby(lat: number, lng: number): Promise<NearbyPOI[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "places.displayName,places.types,places.location",
    },
    body: JSON.stringify({
      includedTypes: ["university", "shopping_mall", "subway_station", "hospital"],
      maxResultCount: 10,
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 1000 } },
    }),
  });
  if (!res.ok) return [];
  const j = await res.json();
  const R = 6371000;
  return (j.places ?? []).map((p: any) => {
    const plat = p.location?.latitude, plng = p.location?.longitude;
    const d = plat && plng
      ? Math.round(2 * R * Math.asin(Math.sqrt(
          Math.sin(((plat - lat) * Math.PI / 180) / 2) ** 2 +
          Math.cos(lat * Math.PI / 180) * Math.cos(plat * Math.PI / 180) *
          Math.sin(((plng - lng) * Math.PI / 180) / 2) ** 2)))
      : 999;
    const t = (p.types ?? []).find((x: string) => POI_TYPE_MAP[x]);
    return { type: t ? POI_TYPE_MAP[t] : "other", name: p.displayName?.text ?? "?", distance_m: d } as NearbyPOI;
  });
}

const PRICE_LEVEL_NUM: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export const GooglePlacesProvider: EnrichmentProvider = {
  name: "google_places",
  async enrich(q: EnrichmentQuery): Promise<OutletEnrichment> {
    if (!KEY) throw new Error("GOOGLE_PLACES_API_KEY not set");
    const place = await textSearch(`${q.outletName} ${q.city}`);
    if (!place) {
      return { source: "google_places", found: false, rating: null, review_count: null,
        review_velocity: null, price_level: null, price_for_two: null, nearby: [], address: null, is_open: null };
    }
    const lat = place.location?.latitude, lng = place.location?.longitude;
    const nearbyPois = lat && lng ? await nearby(lat, lng) : [];
    return {
      source: "google_places",
      found: true,
      rating: place.rating ?? null,
      review_count: place.userRatingCount ?? null,
      review_velocity: null, // Google doesn't expose review timestamps in bulk; needs details-per-review
      price_level: place.priceLevel ? PRICE_LEVEL_NUM[place.priceLevel] ?? null : null,
      price_for_two: null,   // Google has no price-for-two; use price_level band in mapper
      nearby: nearbyPois,
      address: place.formattedAddress ?? null,
      is_open: place.currentOpeningHours?.openNow ?? null,
    };
  },
};
