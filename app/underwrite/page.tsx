// app/underwrite/page.tsx
// Phase 3 — the real underwrite flow: Identity → Documents → Reconciliation → Score → Decision.
// Chains the Phase 1 parse API, Phase 2 reconcile API, and the derived-scoring API.
// Terminal theme via rc-* classes (app/rasoi-theme.css), mobile-first (375px baseline).
"use client";

import { useState } from "react";
import OutletPicker from "@/components/OutletPicker";

type Provenance = "DERIVED" | "MANUAL" | "MANUAL_OVERRIDE" | "ASSUMED";
type DocState = "idle" | "uploading" | "parsing" | "parsed" | "failed";

// A document slot. Bank + Zomato + Swiggy are fixed; aggregator rows are
// repeatable and carry a chosen platform (ONDC / Ownly / Magicpin / Other→name).
type AggPlatform = "ondc" | "ownly" | "magicpin" | "other";
interface DocRow {
  key: string;                 // stable react key
  kind: "bank" | "payout" | "aggregator";
  docType: string;             // sent to /api/parse (bank_statement | <platform>_payout)
  label: string;
  state: DocState;
  detail?: string;
  platform?: AggPlatform;      // aggregator rows only
  platformLabel?: string;      // aggregator "other" free-text name
}

const AGG_OPTIONS: { value: AggPlatform; label: string }[] = [
  { value: "ondc", label: "ONDC" },
  { value: "ownly", label: "Ownly (Rapido)" },
  { value: "magicpin", label: "Magicpin" },
  { value: "other", label: "Other…" },
];
// doc_type for an aggregator row (Other maps to other_payout + a label)
const aggDocType = (r: DocRow) => (r.platform === "other" ? "other_payout" : `${r.platform}_payout`);
// map an existing/parsed doc_type back to a display label for resumed rows
const platformFromDocType = (dt: string) => dt.replace(/_payout$/, "");

const STEPS = ["Identity", "Documents", "Reconciliation", "Score", "Decision"] as const;

export default function UnderwriteFlow() {
  const [step, setStep] = useState(0);
  const [outlet, setOutlet] = useState("");
  const [city, setCity] = useState("Bengaluru");

  // documents — Bank (required) + Zomato + Swiggy fixed, plus repeatable aggregators
  const [docs, setDocs] = useState<DocRow[]>([
    { key: "bank", kind: "bank", docType: "bank_statement", label: "Bank statement (12 mo)", state: "idle" },
    { key: "zomato", kind: "payout", docType: "zomato_payout", label: "Zomato payout (6 mo)", state: "idle" },
    { key: "swiggy", kind: "payout", docType: "swiggy_payout", label: "Swiggy payout (6 mo)", state: "idle" },
  ]);

  // reconciliation
  const [recon, setRecon] = useState<any>(null);
  const [reconBusy, setReconBusy] = useState(false);

  // digital exhaust (Phase 5)
  const [exhaust, setExhaust] = useState<any>(null);
  const [exhaustBusy, setExhaustBusy] = useState(false);
  // existing parsed docs (resume without re-uploading)
  const [existingDocs, setExistingDocs] = useState<string[]>([]);

  // score inputs (manual)
  const [outletCategory, setOutletCategory] = useState("B");
  const [locationCode, setLocationCode] = useState("B");
  const [ambiencePos, setAmbiencePos] = useState(2);
  const [ambienceAvg, setAmbienceAvg] = useState(1);
  const [cibilScore, setCibilScore] = useState(740);
  const [cycleNumber, setCycleNumber] = useState(1);
  const [tenureMonths, setTenureMonths] = useState(24);
  // score inputs (derived, overridable)
  const [avgSales, setAvgSales] = useState<number | "">("");
  const [qqGrowth, setQqGrowth] = useState<number | "">("");
  const [salesProv, setSalesProv] = useState<Provenance>("MANUAL");
  const [growthProv, setGrowthProv] = useState<Provenance>("MANUAL");
  const [catProv, setCatProv] = useState<Provenance>("MANUAL");
  const [locProv, setLocProv] = useState<Provenance>("MANUAL");
  const [ambProv, setAmbProv] = useState<Provenance>("MANUAL");

  const [score, setScore] = useState<any>(null);
  const [scoreBusy, setScoreBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const bandColor = (b: string) => (b === "TRUSTED" ? "var(--rc-lime)" : b === "REVIEW" ? "var(--rc-amber)" : "var(--rc-red)");
  const bucketColor = (b: string) => (b === "G" ? "var(--rc-lime)" : b === "C" ? "var(--rc-amber)" : "var(--rc-red)");

  async function goFromIdentity() {
    setErr(null); setExhaustBusy(true);
    try {
      // fetch digital-exhaust pre-score (auto-fills ambience/menu/location)
      const exRes = await fetch("/api/exhaust", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: outlet.trim(), city: city.trim() }),
      });
      const ex = await exRes.json();
      if (exRes.ok) {
        setExhaust(ex);
        if (ex.derived?.menu_category?.category) { setOutletCategory(ex.derived.menu_category.category); setCatProv("DERIVED"); }
        if (ex.derived?.location?.code) { setLocationCode(ex.derived.location.code); setLocProv("DERIVED"); }
        if (ex.derived?.ambience) {
          if (typeof ex.derived.ambience.pos === "number") setAmbiencePos(ex.derived.ambience.pos);
          if (typeof ex.derived.ambience.avg === "number") setAmbienceAvg(ex.derived.ambience.avg);
          setAmbProv("DERIVED");
        }
      }
      // check for already-parsed docs so analyst can resume without re-uploading
      const dsRes = await fetch(`/api/docs-status?outlet_name=${encodeURIComponent(outlet.trim())}`);
      const ds = await dsRes.json();
      if (dsRes.ok && ds.has_any) {
        const existing: string[] = ds.existing.map((e: any) => e.doc_type);
        setExistingDocs(existing);
        setDocs((d) => {
          // mark fixed rows (bank/zomato/swiggy) parsed if on file
          const rows = d.map((r) =>
            existing.includes(r.docType) ? { ...r, state: "parsed" as DocState, detail: "already on file" } : r);
          // rebuild aggregator rows for any parsed payout type beyond the fixed slots
          const shown = new Set(rows.map((r) => r.docType));
          for (const dt of existing) {
            if (shown.has(dt) || dt === "bank_statement" || !dt.endsWith("_payout")) continue;
            const plat = platformFromDocType(dt);
            const isOther = !["ondc", "ownly", "magicpin"].includes(plat);
            rows.push({
              key: `exist_${dt}`,
              kind: "aggregator",
              docType: dt,
              platform: (isOther ? "other" : plat) as AggPlatform,
              platformLabel: isOther && plat !== "other" ? plat : undefined,
              label: "Aggregator payout",
              state: "parsed",
              detail: "already on file",
            });
            shown.add(dt);
          }
          return rows;
        });
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setExhaustBusy(false);
      setStep(1);
    }
  }

  // ---- aggregator slot helpers ----
  const addAggregator = () =>
    setDocs((d) => [
      ...d,
      { key: crypto.randomUUID(), kind: "aggregator", docType: "ondc_payout", platform: "ondc",
        label: "Aggregator payout", state: "idle" },
    ]);
  const removeRow = (key: string) => setDocs((d) => d.filter((r) => r.key !== key));
  const setAggPlatform = (key: string, platform: AggPlatform) =>
    setDocs((d) => d.map((r) => (r.key === key
      ? { ...r, platform, docType: platform === "other" ? "other_payout" : `${platform}_payout` }
      : r)));
  const setAggLabel = (key: string, platformLabel: string) =>
    setDocs((d) => d.map((r) => (r.key === key ? { ...r, platformLabel } : r)));

  async function uploadDoc(key: string, file: File) {
    setErr(null);
    const row = docs.find((r) => r.key === key);
    if (!row) return;
    setDocs((d) => d.map((r) => (r.key === key ? { ...r, state: "uploading" } : r)));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("doc_type", row.kind === "aggregator" ? aggDocType(row) : row.docType);
      fd.append("outlet_name", outlet.trim());
      if (row.kind === "aggregator" && row.platform === "other" && row.platformLabel)
        fd.append("platform_label", row.platformLabel.trim());
      setDocs((d) => d.map((r) => (r.key === key ? { ...r, state: "parsing" } : r)));
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok || j.manual_fallback) {
        setDocs((d) => d.map((r) => (r.key === key ? { ...r, state: "failed", detail: j.detail ?? "parse failed" } : r)));
        return;
      }
      const detail = row.kind === "bank"
        ? `${j.txn_count} txns · ${Math.round((j.confidence ?? 0) * 100)}%`
        : `${j.settlement_count} settlements · ${Math.round((j.confidence ?? 0) * 100)}%`;
      setDocs((d) => d.map((r) => (r.key === key ? { ...r, state: "parsed", detail } : r)));
    } catch (e: any) {
      setDocs((d) => d.map((r) => (r.key === key ? { ...r, state: "failed", detail: String(e?.message ?? e) } : r)));
    }
  }

  async function runReconcile() {
    setReconBusy(true); setErr(null);
    try {
      const res = await fetch("/api/reconcile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_name: outlet.trim() }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(JSON.stringify(j)); return; }
      setRecon(j);
      // auto-fill derived score inputs
      if (typeof j.derived?.avg_monthly_sales === "number") { setAvgSales(j.derived.avg_monthly_sales); setSalesProv("DERIVED"); }
      if (typeof j.derived?.qq_growth_pct === "number") { setQqGrowth(j.derived.qq_growth_pct); setGrowthProv("DERIVED"); }
      setStep(2);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setReconBusy(false); }
  }

  async function runScore() {
    setScoreBusy(true); setErr(null);
    try {
      const provenance: Record<string, Provenance> = {
        avgMonthlySales: salesProv, qqGrowth: growthProv,
        margin: catProv, location: locProv, ambience: ambProv, cibil: "MANUAL",
      };
      const res = await fetch("/api/score-derived", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_name: outlet.trim(),
          reconciliation_id: recon?.reconciliation_id ?? null,
          outletCategory, locationCode, ambiencePos, ambienceAvg, cibilScore, cycleNumber, tenureMonths,
          avgMonthlySalesInr: Number(avgSales) || 0,
          qqGrowthPct: Number(qqGrowth) || 0,
          provenance,
          disBand: recon?.integrity?.band ?? null,
        }),
      });
      const j = await res.json();
      if (!res.ok) { setErr(JSON.stringify(j)); return; }
      setScore(j); setStep(4);
    } catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setScoreBusy(false); }
  }

  const Badge = ({ p }: { p: Provenance }) => {
    const map: Record<Provenance, string> = {
      DERIVED: "der", MANUAL: "man", MANUAL_OVERRIDE: "der", ASSUMED: "man",
    };
    const label: Record<Provenance, string> = {
      DERIVED: "DERIVED", MANUAL: "MANUAL", MANUAL_OVERRIDE: "OVERRIDE", ASSUMED: "ASSUMED",
    };
    return <span className={`rc-badge ${map[p]}`}>{label[p]}</span>;
  };

  // Only the bank statement is required to reconcile; aggregators are optional.
  const bankParsed = docs.some((d) => d.kind === "bank" && d.state === "parsed");
  const canNext = step === 0 ? outlet.trim().length > 0
    : step === 1 ? bankParsed
    : true;

  return (
    <div className="rc-page" style={{ minHeight: "auto", background: "transparent" }}>
      <div className="mx-auto w-full max-w-3xl">
        {/* Stepper */}
        <div className="mb-6 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className="rc-mono flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                   style={i <= step
                     ? { background: "var(--rc-cyan)", color: "var(--rc-bg)" }
                     : { background: "var(--rc-panel2)", color: "var(--rc-dim)" }}>{i + 1}</div>
              <span className="ml-2 hidden text-xs sm:inline"
                    style={{ color: i <= step ? "var(--rc-fg)" : "var(--rc-dim)" }}>{s}</span>
              {i < STEPS.length - 1 && <div className="mx-2 h-0.5 flex-1"
                    style={{ background: i < step ? "var(--rc-cyan)" : "var(--rc-line)" }} />}
            </div>
          ))}
        </div>

        {err && <pre className="rc-mono mb-4 overflow-auto rounded-lg p-3 text-xs"
                  style={{ border: "1px solid var(--rc-red)", background: "rgba(248,81,73,.1)", color: "var(--rc-red)" }}>{err}</pre>}

        {/* Step 0 — Identity */}
        {step === 0 && (
          <div className="rc-panel space-y-4">
            <div className="rc-panel-title">Outlet Identity</div>
            <label className="rc-label">Outlet name
              <div className="mt-1">
                <OutletPicker
                  value={outlet}
                  city={city}
                  onPick={({ name, city: pickedCity }) => { setOutlet(name); setCity(pickedCity); }}
                />
              </div></label>
            <label className="rc-label">City
              <input value={city} onChange={(e) => setCity(e.target.value)}
                className="rc-input mt-1" /></label>
          </div>
        )}

        {/* Step 1 — Documents */}
        {step === 1 && (
          <div className="rc-panel space-y-4">
            <div className="rc-panel-title">Documents — {outlet}</div>
            {existingDocs.length > 0 && (
              <div className="rounded-lg px-3 py-2 text-xs"
                   style={{ background: "var(--rc-badge-der-bg)", color: "var(--rc-badge-der-fg)" }}>
                ✓ {existingDocs.length} document(s) already on file for this outlet — you can reconcile without re-uploading, or upload fresh copies to replace.
              </div>
            )}
            {exhaust && (
              <div className="rounded-lg p-3" style={{ background: "var(--rc-panel2)", border: "1px solid var(--rc-line)" }}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: "var(--rc-fg)" }}>Digital exhaust pre-score</span>
                  <span className="rc-mono rounded px-2 py-0.5 text-xs font-bold"
                        style={{ background: "var(--rc-cyan)", color: "var(--rc-bg)" }}>{exhaust.prescore} / 5</span>
                </div>
                <div className="rc-mono text-[11px]" style={{ color: "var(--rc-dim)" }}>
                  {exhaust.signals?.rating}★ · Cat {exhaust.derived?.menu_category?.category} · Loc {exhaust.derived?.location?.code} · scored before any document upload
                </div>
                <div className="mt-1 text-[10px] italic" style={{ color: "var(--rc-dim)" }}>Demo Mode — live Google Places feed connects on go-live.</div>
              </div>
            )}
            {docs.map((d) => {
              const otherNeedsName = d.kind === "aggregator" && d.platform === "other" && !d.platformLabel?.trim();
              return (
                <div key={d.key} className="rounded-lg p-4" style={{ border: "1px dashed var(--rc-line)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {d.kind === "aggregator" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={d.platform} onChange={(e) => setAggPlatform(d.key, e.target.value as AggPlatform)}
                            className="rc-select" style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}>
                            {AGG_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          {d.platform === "other" && (
                            <input value={d.platformLabel ?? ""} onChange={(e) => setAggLabel(d.key, e.target.value)}
                              placeholder="Platform name" className="rc-input" style={{ width: 160, padding: "6px 10px", fontSize: 13 }} />
                          )}
                          <span className="text-xs" style={{ color: "var(--rc-dim)" }}>payout</span>
                        </div>
                      ) : (
                        <div className="text-sm font-medium" style={{ color: "var(--rc-fg)" }}>{d.label}
                          {d.kind === "bank" && <span className="ml-1 text-xs" style={{ color: "var(--rc-amber)" }}>· required</span>}
                        </div>
                      )}
                      <div className="rc-mono mt-1 text-xs" style={{ color: d.state === "parsed" ? "var(--rc-lime)" : d.state === "failed" ? "var(--rc-red)" : "var(--rc-dim)" }}>
                        {d.state === "idle" ? "Not uploaded" : d.state === "uploading" ? "Uploading…" : d.state === "parsing" ? "Parsing… (bank statements take 1–3 min)" : d.state === "parsed" ? `✓ ${d.detail}` : `✗ ${d.detail}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="rc-btn cursor-pointer" style={{ width: "auto", padding: "8px 14px", fontSize: 13, opacity: otherNeedsName ? 0.5 : 1 }}>
                        Choose PDF
                        <input type="file" accept="application/pdf" className="hidden" disabled={otherNeedsName}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(d.key, f); }} />
                      </label>
                      {d.kind === "aggregator" && (
                        <button onClick={() => removeRow(d.key)} aria-label="Remove aggregator"
                          className="rc-btn rc-btn-ghost" style={{ width: "auto", padding: "8px 12px", fontSize: 13 }}>✕</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={addAggregator} className="rc-btn rc-btn-ghost" style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}>
              + Add aggregator
            </button>
            <button onClick={runReconcile} disabled={reconBusy || !bankParsed}
              className="rc-btn">
              {reconBusy ? "Reconciling…" : "Reconcile & Continue →"}
            </button>
            <p className="text-xs" style={{ color: "var(--rc-dim)" }}>
              Only the bank statement is required. All aggregator payouts are reconciled together against it in one pooled pass.
            </p>
          </div>
        )}

        {/* Step 2 — Reconciliation */}
        {step === 2 && recon && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rc-panel text-center" style={{ padding: 16 }}>
                <div className="rc-eyebrow">Match Rate</div>
                <div className="rc-mono text-2xl font-bold" style={{ color: "var(--rc-fg)" }}>{recon.match.rate}%</div>
                <div className="text-xs" style={{ color: "var(--rc-dim)" }}>{recon.match.matched} matched</div>
              </div>
              <div className="rc-panel text-center" style={{ padding: 16 }}>
                <div className="rc-eyebrow">Data Integrity</div>
                <div className="rc-mono text-2xl font-bold" style={{ color: bandColor(recon.integrity.band) }}>{recon.integrity.dis}</div>
                <div className="rc-mono text-xs font-semibold" style={{ color: bandColor(recon.integrity.band) }}>{recon.integrity.band}</div>
              </div>
              <div className="rc-panel text-center" style={{ padding: 16 }}>
                <div className="rc-eyebrow">Avg Monthly Sales</div>
                <div className="rc-mono text-2xl font-bold" style={{ color: "var(--rc-fg)" }}>₹{(recon.derived.avg_monthly_sales / 100000).toFixed(2)}L</div>
                <div className="text-xs" style={{ color: "var(--rc-dim)" }}>QoQ {recon.derived.qq_growth_pct}%</div>
              </div>
            </div>
            {recon.integrity.anomalies?.length > 0 && (
              <div className="rc-panel" style={{ borderLeft: "3px solid var(--rc-red)" }}>
                <div className="mb-2 text-sm font-semibold" style={{ color: "var(--rc-red)" }}>{recon.integrity.anomaly_count} anomalies detected</div>
                <ul className="space-y-1 text-xs" style={{ color: "var(--rc-dim)" }}>
                  {recon.integrity.anomalies.slice(0, 6).map((a: any, i: number) => (<li key={i}>• <b style={{ color: "var(--rc-fg)" }}>{a.type}</b> ({a.severity}) — {a.detail}</li>))}
                </ul>
              </div>
            )}
            <button onClick={() => setStep(3)} className="rc-btn">Continue to Scoring →</button>
          </div>
        )}

        {/* Step 3 — Score inputs */}
        {step === 3 && (
          <div className="rc-panel space-y-4">
            <div className="rc-panel-title">6-Factor Scoring</div>
            <div className="grid grid-cols-2 gap-4">
              <label className="rc-label">Avg Monthly Sales (₹)<Badge p={salesProv} />
                <input type="number" value={avgSales} onChange={(e) => { setAvgSales(e.target.value === "" ? "" : Number(e.target.value)); if (salesProv === "DERIVED") setSalesProv("MANUAL_OVERRIDE"); }}
                  className="rc-input mt-1" /></label>
              <label className="rc-label">Q-Q Growth (%)<Badge p={growthProv} />
                <input type="number" value={qqGrowth} onChange={(e) => { setQqGrowth(e.target.value === "" ? "" : Number(e.target.value)); if (growthProv === "DERIVED") setGrowthProv("MANUAL_OVERRIDE"); }}
                  className="rc-input mt-1" /></label>
              <label className="rc-label">Menu Category<Badge p={catProv} />
                <select value={outletCategory} onChange={(e) => { setOutletCategory(e.target.value); if (catProv === "DERIVED") setCatProv("MANUAL_OVERRIDE"); }} className="rc-select mt-1">
                  {["A", "B", "C", "D"].map((c) => <option key={c} value={c}>Cat {c}</option>)}</select></label>
              <label className="rc-label">Location<Badge p={locProv} />
                <select value={locationCode} onChange={(e) => { setLocationCode(e.target.value); if (locProv === "DERIVED") setLocProv("MANUAL_OVERRIDE"); }} className="rc-select mt-1">
                  {["A", "B", "C", "D", "E"].map((c) => <option key={c} value={c}>Loc {c}</option>)}</select></label>
              <label className="rc-label">Ambience — positive<Badge p={ambProv} />
                <select value={ambiencePos} onChange={(e) => { setAmbiencePos(Number(e.target.value)); if (ambProv === "DERIVED") setAmbProv("MANUAL_OVERRIDE"); }} className="rc-select mt-1">
                  {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} positive</option>)}</select></label>
              <label className="rc-label">Ambience — average<Badge p={ambProv} />
                <select value={ambienceAvg} onChange={(e) => { setAmbienceAvg(Number(e.target.value)); if (ambProv === "DERIVED") setAmbProv("MANUAL_OVERRIDE"); }} className="rc-select mt-1">
                  {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} average</option>)}</select></label>
              <label className="rc-label">CIBIL Score<Badge p="MANUAL" />
                <input type="number" value={cibilScore} onChange={(e) => setCibilScore(Number(e.target.value))} className="rc-input mt-1" /></label>
              <label className="rc-label">Loan Cycle<Badge p="MANUAL" />
                <select value={cycleNumber} onChange={(e) => setCycleNumber(Number(e.target.value))} className="rc-select mt-1">
                  <option value={1}>1st loan (cap ₹3L)</option><option value={2}>2nd loan (cap ₹7L)</option><option value={3}>3rd+ loan</option></select></label>
              <label className="rc-label">Tenure (months)<Badge p="MANUAL" />
                <select value={tenureMonths} onChange={(e) => setTenureMonths(Number(e.target.value))} className="rc-select mt-1">
                  <option value={24}>24 months (default)</option><option value={12}>12 months</option><option value={18}>18 months</option><option value={36}>36 months</option></select></label>
            </div>
            <button onClick={runScore} disabled={scoreBusy} className="rc-btn">
              {scoreBusy ? "Scoring…" : "Analyse & Underwrite →"}</button>
          </div>
        )}

        {/* Step 4 — Decision */}
        {step === 4 && score && (
          <div className="space-y-4">
            <div className="rc-panel text-center" style={{ borderLeft: `3px solid ${bucketColor(score.bucket)}` }}>
              <div className="rc-eyebrow">Decision</div>
              <div className="rc-mono text-3xl font-bold" style={{ color: bucketColor(score.bucket) }}>{score.bucket_label}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--rc-dim)" }}>Composite score {score.composite_score} / 5.0 · {score.decision.replace(/_/g, " ")}</div>
              {score.integrity_override && (
                <div className="mt-3 rounded-lg p-2 text-xs font-semibold"
                     style={{ background: "rgba(248,81,73,.1)", color: "var(--rc-red)" }}>
                  ⚠ Data-integrity override: reconciliation FLAGGED — forced to Pause regardless of score
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {Object.entries(score.factors).map(([k, v]) => (
                <div key={k} className="rc-panel" style={{ padding: 12 }}>
                  <div style={{ color: "var(--rc-dim)" }}>{k}</div><div className="rc-mono text-lg font-bold" style={{ color: "var(--rc-fg)" }}>{v as number}/5</div>
                </div>))}
            </div>
            <div className="rc-panel text-sm" style={{ color: "var(--rc-fg)" }}>
              <div className="rc-panel-title" style={{ marginBottom: 12 }}>Loan Terms</div>
              <div className="grid grid-cols-2 gap-y-1">
                <span style={{ color: "var(--rc-dim)" }}>Final loan amount</span><span className="rc-mono text-right font-medium">₹{score.loan_terms.finalLoanAmtInr.toLocaleString("en-IN")}</span>
                <span style={{ color: "var(--rc-dim)" }}>Interest rate</span><span className="rc-mono text-right font-medium">{score.loan_terms.interestRatePct}%</span>
                <span style={{ color: "var(--rc-dim)" }}>Tenure</span><span className="rc-mono text-right font-medium">{score.loan_terms.tenureMonths} mo</span>
                <span style={{ color: "var(--rc-dim)" }}>Monthly EMI</span><span className="rc-mono text-right font-medium">₹{score.loan_terms.monthlyEmiInr.toLocaleString("en-IN")}</span>
                <span style={{ color: "var(--rc-dim)" }}>Weekly collection</span><span className="rc-mono text-right font-medium">₹{score.loan_terms.weeklyEmiInr.toLocaleString("en-IN")}</span>
                <span style={{ color: "var(--rc-dim)" }}>Disbursement</span><span className="rc-mono text-right font-medium">₹{score.loan_terms.disbursementInr.toLocaleString("en-IN")}</span>
                <span style={{ color: "var(--rc-dim)" }}>Collateral required</span><span className="rc-mono text-right font-medium">{score.loan_terms.collateralRequired ? "Yes" : "No"}</span>
              </div>
            </div>
            <div className="rc-panel text-xs" style={{ color: "var(--rc-dim)" }}>
              <div className="rc-panel-title" style={{ marginBottom: 8 }}>Data Provenance</div>
              Avg sales & QoQ growth: <b style={{ color: "var(--rc-fg)" }}>derived from reconciliation</b> (DIS {recon?.integrity?.dis}, {recon?.integrity?.band}). Margin, location, ambience, CIBIL: analyst-entered.
            </div>
            <button onClick={() => { setStep(0); setScore(null); setRecon(null); }} className="rc-btn rc-btn-ghost">Start new underwrite</button>
          </div>
        )}

        {/* Nav */}
        {step < 2 && (
          <div className="mt-4 flex justify-between">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="rc-btn rc-btn-ghost" style={{ width: "auto", padding: "10px 16px", fontSize: 14 }}>← Back</button>
            {step === 0 && (
              <button onClick={goFromIdentity} disabled={!canNext || exhaustBusy}
                className="rc-btn" style={{ width: "auto", padding: "10px 16px", fontSize: 14 }}>{exhaustBusy ? "Fetching…" : "Next →"}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
