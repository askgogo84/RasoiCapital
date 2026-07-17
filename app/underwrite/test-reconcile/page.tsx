// app/underwrite/test-reconcile/page.tsx
// Phase 2 test page: run reconciliation for an outlet whose docs are already parsed.
"use client";
import { useState } from "react";

export default function ReconcileTestPage() {
  const [outlet, setOutlet] = useState("Spice Garden");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setRes(null); setErr(null);
    try {
      const r = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: outlet.trim() }),
      });
      const j = await r.json();
      if (!r.ok) setErr(JSON.stringify(j, null, 2)); else setRes(j);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(false); }
  }

  const bandColor = (b: string) =>
    b === "TRUSTED" ? "#059669" : b === "REVIEW" ? "#d97706" : "#dc2626";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reconcile Test (Phase 2)</h1>
          <p className="text-sm text-slate-500">Runs matcher + Data Integrity Score on an outlet's already-parsed documents.</p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Outlet name
          <input value={outlet} onChange={(e) => setOutlet(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900" />
        </label>
        <button onClick={run} disabled={busy || !outlet.trim()}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-40">
          {busy ? "Reconciling…" : "Run Reconciliation"}
        </button>

        {err && <pre className="overflow-auto rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">{err}</pre>}

        {res && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <div className="text-xs text-slate-500">Match Rate</div>
                <div className="text-2xl font-bold text-slate-900">{res.match.rate}%</div>
                <div className="text-xs text-slate-500">{res.match.matched} matched · {res.match.unmatched_payouts} unmatched</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <div className="text-xs text-slate-500">Data Integrity</div>
                <div className="text-2xl font-bold" style={{ color: bandColor(res.integrity.band) }}>{res.integrity.dis}</div>
                <div className="text-xs font-semibold" style={{ color: bandColor(res.integrity.band) }}>{res.integrity.band}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <div className="text-xs text-slate-500">Avg Monthly Sales</div>
                <div className="text-2xl font-bold text-slate-900">₹{(res.derived.avg_monthly_sales/100000).toFixed(2)}L</div>
                <div className="text-xs text-slate-500">QoQ {res.derived.qq_growth_pct}%</div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
              <span className="mr-4">match_score: <b>{res.integrity.match_rate_score}</b></span>
              <span className="mr-4">variance: <b>{res.integrity.variance_score}</b></span>
              <span>anomaly: <b>{res.integrity.anomaly_score}</b></span>
            </div>

            {res.integrity.anomalies?.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="mb-2 text-sm font-semibold text-red-800">{res.integrity.anomaly_count} anomalies detected</div>
                <ul className="space-y-1 text-xs text-red-700">
                  {res.integrity.anomalies.slice(0, 8).map((a: any, i: number) => (
                    <li key={i}>• <b>{a.type}</b> ({a.severity}) — {a.detail}</li>
                  ))}
                  {res.integrity.anomalies.length > 8 && <li className="italic">…and {res.integrity.anomalies.length - 8} more</li>}
                </ul>
              </div>
            )}

            <details className="rounded-lg border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Monthly series</summary>
              <pre className="mt-2 overflow-auto text-xs text-slate-600">{JSON.stringify(res.monthly_series, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
