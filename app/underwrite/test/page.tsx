// app/underwrite/test/page.tsx
// Minimal Phase-1 test page: upload a PDF, see the parse result.
// Temporary tool — replaced by the full flow in Phase 3.
"use client";

import { useState } from "react";

type Result = Record<string, unknown> | null;

export default function ParseTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("bank_statement");
  const [outlet, setOutlet] = useState("Spice Garden");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file || !outlet.trim()) return;
    setBusy(true); setResult(null); setError(null); setElapsed(0);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", docType);
      fd.append("outlet_name", outlet.trim());
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) setError(JSON.stringify(json, null, 2));
      else setResult(json);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Parse Test (Phase 1)</h1>
          <p className="text-sm text-slate-500">Internal tool — upload a bank statement or payout PDF and inspect the parse result.</p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Outlet name
          <input value={outlet} onChange={(e) => setOutlet(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900" />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Document type
          <select value={docType} onChange={(e) => setDocType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900">
            <option value="bank_statement">Bank statement</option>
            <option value="zomato_payout">Zomato payout</option>
            <option value="swiggy_payout">Swiggy payout</option>
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          PDF file
          <input type="file" accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-lg border border-dashed border-slate-400 bg-white px-3 py-6 text-sm" />
        </label>

        <button onClick={run} disabled={busy || !file || !outlet.trim()}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-40">
          {busy ? `Parsing… ${elapsed}s (bank statements take 1–3 min)` : "Upload & Parse"}
        </button>

        {error && (
          <pre className="overflow-auto rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">{error}</pre>
        )}
        {result && (
          <pre className="overflow-auto rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
