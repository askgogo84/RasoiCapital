// components/OutletPicker.tsx — searchable dropdown of existing outlets + free-type fallback.
// Loads from /api/outlets. Picking an existing outlet fills name + city (and passes the id up).
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Outlet = {
  id: string | null;
  outlet_name: string;
  city: string | null;
  outlet_category?: string | null;
  google_maps_rating?: number | null;
};

export default function OutletPicker({
  value, city, onPick,
}: {
  value: string;
  city: string;
  onPick: (o: { name: string; city: string; outletId: string | null }) => void;
}) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [loading, setLoading] = useState(true);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/outlets")
      .then((r) => r.json())
      .then((j) => { if (j.outlets) setOutlets(j.outlets); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return outlets;
    return outlets.filter((o) => o.outlet_name.toLowerCase().includes(q));
  }, [outlets, query]);

  const exactMatch = outlets.some((o) => o.outlet_name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        className="rc-input"
        placeholder="e.g. Green Leaf Cafe"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onPick({ name: e.target.value, city, outletId: null }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div className="rc-panel" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 40,
          maxHeight: 260, overflowY: "auto", padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,.3)",
        }}>
          {loading && <div style={{ padding: 12, fontSize: 13, color: "var(--rc-dim)" }}>Loading outlets…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: 13, color: "var(--rc-dim)" }}>
              No match. Press Next to underwrite “{query}” as a new outlet.
            </div>
          )}
          {!loading && filtered.map((o, i) => (
            <button
              key={`${o.outlet_name}-${i}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick({ name: o.outlet_name, city: o.city || city || "Bengaluru", outletId: o.id });
                setQuery(o.outlet_name);
                setOpen(false);
              }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
                textAlign: "left", padding: "9px 12px", background: "transparent", border: "none",
                borderRadius: 8, cursor: "pointer", color: "var(--rc-fg)", fontSize: 14,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--rc-panel2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span>{o.outlet_name}</span>
              <span className="rc-mono" style={{ fontSize: 11, color: "var(--rc-dim)" }}>
                {o.city || ""}{o.google_maps_rating ? ` · ★${o.google_maps_rating}` : ""}{o.id ? "" : " · from docs"}
              </span>
            </button>
          ))}
          {!loading && query.trim() && !exactMatch && filtered.length > 0 && (
            <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--rc-dim)", borderTop: "1px solid var(--rc-line)", marginTop: 4 }}>
              Or press Next to underwrite “{query}” as a new outlet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
