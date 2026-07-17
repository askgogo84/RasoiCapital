// app/underwrite/prescore/page.tsx
// Digital-exhaust pre-score screen: fetch ratings, price & nearby POIs → pre-score an outlet
// before any visit or documents. Part of the demo flow. Terminal theme via rc-* classes.
"use client";
import { useState } from "react";

export default function PrescorePage() {
  const [outlet, setOutlet] = useState("Green Leaf Cafe");
  const [city, setCity] = useState("Bengaluru");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setRes(null); setErr(null);
    try {
      const r = await fetch("/api/exhaust", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: outlet.trim(), city: city.trim() }),
      });
      const j = await r.json();
      if (!r.ok) setErr(JSON.stringify(j, null, 2)); else setRes(j);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--rc-fg)" }}>Digital Exhaust Pre-Score</h1>
        <p className="rc-eyebrow" style={{ marginTop: 4 }}>Fetches ratings, price & nearby POIs → pre-scores an outlet before any visit or documents.</p>
      </div>
      <div className="rc-panel space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="rc-label">Outlet name
            <input value={outlet} onChange={(e) => setOutlet(e.target.value)} className="rc-input mt-1" /></label>
          <label className="rc-label">City
            <input value={city} onChange={(e) => setCity(e.target.value)} className="rc-input mt-1" /></label>
        </div>
        <button onClick={run} disabled={busy || !outlet.trim()} className="rc-btn">
          {busy ? "Fetching…" : "Fetch Pre-Score"}
        </button>
      </div>

      {err && <pre className="rc-mono overflow-auto rounded-lg p-3 text-xs"
                style={{ border: "1px solid var(--rc-red)", background: "rgba(248,81,73,.1)", color: "var(--rc-red)" }}>{err}</pre>}

      {res && (
        <div className="space-y-4">
          {res.source === "mock" && (
            <div className="rc-mono rounded-lg px-3 py-2 text-center text-xs font-semibold"
                 style={{ background: "var(--rc-panel2)", color: "var(--rc-dim)" }}>
              Demo Mode — live Google Places feed connects on go-live.
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rc-panel" style={{ padding: 12 }}>
              <div className="rc-eyebrow">Rating</div><div className="rc-mono text-lg font-bold" style={{ color: "var(--rc-fg)" }}>{res.signals.rating}★</div>
              <div className="text-[10px]" style={{ color: "var(--rc-dim)" }}>{res.signals.review_count} rev</div></div>
            <div className="rc-panel" style={{ padding: 12 }}>
              <div className="rc-eyebrow">Velocity</div><div className="rc-mono text-lg font-bold" style={{ color: "var(--rc-fg)" }}>{res.signals.review_velocity ?? "—"}</div>
              <div className="text-[10px]" style={{ color: "var(--rc-dim)" }}>rev/mo</div></div>
            <div className="rc-panel" style={{ padding: 12 }}>
              <div className="rc-eyebrow">Price/2</div><div className="rc-mono text-lg font-bold" style={{ color: "var(--rc-fg)" }}>₹{res.signals.price_for_two ?? "—"}</div></div>
            <div className="rc-panel" style={{ padding: 12, borderColor: "var(--rc-lime)", borderWidth: 2 }}>
              <div className="rc-eyebrow">Pre-Score</div><div className="rc-mono text-xl font-bold" style={{ color: "var(--rc-lime)" }}>{res.prescore}</div><div className="text-[10px]" style={{ color: "var(--rc-dim)" }}>/ 5</div></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rc-panel" style={{ padding: 12 }}>
              <div className="font-semibold" style={{ color: "var(--rc-fg)" }}>Ambience</div>
              <div style={{ color: "var(--rc-dim)" }}>pos {res.derived.ambience.pos} / avg {res.derived.ambience.avg}</div>
              <div className="mt-1 text-[10px]" style={{ color: "var(--rc-dim)" }}>{res.derived.ambience.basis}</div></div>
            <div className="rc-panel" style={{ padding: 12 }}>
              <div className="font-semibold" style={{ color: "var(--rc-fg)" }}>Menu Category</div>
              <div style={{ color: "var(--rc-dim)" }}>Cat {res.derived.menu_category.category}</div>
              <div className="mt-1 text-[10px]" style={{ color: "var(--rc-dim)" }}>{res.derived.menu_category.basis}</div></div>
            <div className="rc-panel" style={{ padding: 12 }}>
              <div className="font-semibold" style={{ color: "var(--rc-fg)" }}>Location</div>
              <div style={{ color: "var(--rc-dim)" }}>Loc {res.derived.location.code} (score {res.derived.location.score})</div>
              <div className="mt-1 text-[10px]" style={{ color: "var(--rc-dim)" }}>{res.derived.location.basis}</div></div>
          </div>
          {res.signals.nearby?.length > 0 && (
            <div className="rc-panel text-xs" style={{ padding: 12 }}>
              <div className="mb-1 font-semibold" style={{ color: "var(--rc-fg)" }}>Nearby (footfall drivers)</div>
              <ul className="space-y-0.5" style={{ color: "var(--rc-dim)" }}>
                {res.signals.nearby.map((p: any, i: number) => (<li key={i}>• {p.type.replace("_", " ")}: {p.name} — {p.distance_m}m</li>))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
