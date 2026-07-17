// app/underwrite/test-exhaust/page.tsx
// Phase 4 test page: fetch digital-exhaust pre-score for an outlet (mock source for now).
"use client";
import { useState } from "react";

export default function ExhaustTestPage() {
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
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Digital Exhaust Pre-Score (Phase 4)</h1>
          <p className="text-sm text-slate-500">Fetches ratings, price & nearby POIs → pre-scores an outlet before any visit or documents.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">Outlet name
            <input value={outlet} onChange={(e) => setOutlet(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900" /></label>
          <label className="block text-sm font-medium text-slate-700">City
            <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900" /></label>
        </div>
        <button onClick={run} disabled={busy || !outlet.trim()} className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-40">
          {busy ? "Fetching…" : "Fetch Pre-Score"}
        </button>

        {err && <pre className="overflow-auto rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">{err}</pre>}

        {res && (
          <div className="space-y-4">
            {res.source === "mock" && (
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-semibold text-slate-600">
                Demo Mode — live Google Places feed connects on go-live.
              </div>
            )}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Rating</div><div className="text-lg font-bold text-slate-900">{res.signals.rating}★</div>
                <div className="text-[10px] text-slate-400">{res.signals.review_count} rev</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Velocity</div><div className="text-lg font-bold text-slate-900">{res.signals.review_velocity ?? "—"}</div>
                <div className="text-[10px] text-slate-400">rev/mo</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500">Price/2</div><div className="text-lg font-bold text-slate-900">₹{res.signals.price_for_two ?? "—"}</div></div>
              <div className="rounded-xl border-2 border-emerald-500 bg-white p-3">
                <div className="text-xs text-slate-500">Pre-Score</div><div className="text-xl font-bold text-emerald-600">{res.prescore}</div><div className="text-[10px] text-slate-400">/ 5</div></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="font-semibold text-slate-900">Ambience</div>
                <div className="text-slate-500">pos {res.derived.ambience.pos} / avg {res.derived.ambience.avg}</div>
                <div className="mt-1 text-[10px] text-slate-400">{res.derived.ambience.basis}</div></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="font-semibold text-slate-900">Menu Category</div>
                <div className="text-slate-500">Cat {res.derived.menu_category.category}</div>
                <div className="mt-1 text-[10px] text-slate-400">{res.derived.menu_category.basis}</div></div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="font-semibold text-slate-900">Location</div>
                <div className="text-slate-500">Loc {res.derived.location.code} (score {res.derived.location.score})</div>
                <div className="mt-1 text-[10px] text-slate-400">{res.derived.location.basis}</div></div>
            </div>
            {res.signals.nearby?.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                <div className="mb-1 font-semibold text-slate-900">Nearby (footfall drivers)</div>
                <ul className="space-y-0.5 text-slate-600">
                  {res.signals.nearby.map((p: any, i: number) => (<li key={i}>• {p.type.replace("_", " ")}: {p.name} — {p.distance_m}m</li>))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
