// app/projections/page.tsx — the company's real 3-year financial model,
// ported from Loan_Projection_V2.xlsx. One long dashboard page; a section per
// workbook tab; every input editable; everything recalculates client-side via
// lib/model/engine.ts. No server calls, no storage — edits are session-only.
"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, Area, AreaChart, Cell,
} from "recharts";
import { computeModel } from "@/lib/model/engine";
import { DEFAULT_STATE, deriveInputs, makeDefaultState, type ModelState } from "./state";
import { exportModel } from "./export";
import { inr, crAxis, num } from "./format";
import { CH, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, Section, ChartCard, KpiCard } from "./ui";
import { LoanEngine } from "./sections/LoanEngine";
import { TechCost, Operations, Marketing, Setup } from "./sections/costs";
import { PnL } from "./sections/PnL";
import { Provisioning, Cities } from "./sections/tables";

const SECTIONS: [string, string][] = [
  ["dashboard", "Dashboard"],
  ["loan-engine", "Loan Engine"],
  ["cities", "City Break Up"],
  ["pnl", "P&L"],
  ["tech", "Tech Cost"],
  ["operations", "Operations"],
  ["marketing", "Marketing & Sales"],
  ["setup", "Set-Up Cost"],
  ["provisioning", "Bad-Debt Provisioning"],
];
const SECTION_IDS = SECTIONS.map((s) => s[0]);

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids]);
  return active;
}

export default function ProjectionsPage() {
  const [state, setState] = useState<ModelState>(() => JSON.parse(JSON.stringify(DEFAULT_STATE)));
  const inputs = useMemo(() => deriveInputs(state), [state]);
  const outputs = useMemo(() => computeModel(inputs), [inputs]);
  const active = useScrollSpy(SECTION_IDS);

  return (
    <div className="rc-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
        <div>
          <div className="rc-eyebrow">Investor Model · Loan_Projection_V3</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--rc-fg)", marginTop: 4 }}>Financial Projections</h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="rc-btn" style={{ width: "auto", padding: "10px 16px", fontSize: 14 }} onClick={() => exportModel(state, outputs)}>
            ⬇ Export to Excel
          </button>
          <button
            className="rc-btn rc-btn-ghost"
            style={{ width: "auto", padding: "10px 16px", fontSize: 14 }}
            onClick={() => setState(makeDefaultState())}
          >
            ↺ Reset to model defaults
          </button>
        </div>
      </div>
      <p style={{ color: "var(--rc-dim)", fontSize: 13, marginBottom: 20 }}>
        The full 3-year model from the CFO workbook. Every input is editable and the whole model
        recalculates instantly. <span className="rc-mono" style={{ color: "var(--rc-amber)" }}>Edits are local to this session.</span>
      </p>

      <div className="rc-proj-layout">
        <nav className="rc-proj-nav" aria-label="Model sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className={active === id ? "active" : ""}>{label}</a>
          ))}
        </nav>

        <div style={{ minWidth: 0 }}>
          <Dashboard outputs={outputs} />

          <LoanEngine state={state} setState={setState} outputs={outputs} />

          <Cities state={state} setState={setState} />
          <PnL outputs={outputs} />

          <TechCost state={state} setState={setState} />
          <Operations state={state} setState={setState} />
          <Marketing state={state} setState={setState} />
          <Setup state={state} setState={setState} />

          <Provisioning state={state} setState={setState} outputs={outputs} />
        </div>
      </div>
    </div>
  );
}

function Dashboard({ outputs }: { outputs: ReturnType<typeof computeModel> }) {
  const [Y1, Y2, Y3] = outputs.years;
  const years = [Y1, Y2, Y3];

  const monthly = outputs.monthly.map((r) => ({
    m: `M${r.month}`,
    disbursed: r.disbursed,
    collections: r.emiCollection,
    book: r.totalBook,
  }));

  const yearRows = years.map((y, i) => ({
    year: `Y${i + 1}`,
    ebitda: y.ebitda,
    income: y.totalIncome,
    expense: y.costOfCapital + y.techCost + y.operationsCost + y.marketingCost + y.provision,
  }));

  const ebitdaBreakeven = Y3.ebitda > 0;

  return (
    <Section id="dashboard" title="Dashboard" eyebrow="At a glance">
      {/* Breakeven badge */}
      <div
        className="rc-panel"
        style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 18, padding: "14px 18px",
          borderLeft: `3px solid ${ebitdaBreakeven ? "var(--rc-lime)" : "var(--rc-amber)"}`,
        }}
      >
        <span style={{ fontSize: 22 }}>{ebitdaBreakeven ? "✓" : "…"}</span>
        <div>
          <div style={{ fontWeight: 700, color: ebitdaBreakeven ? "var(--rc-lime)" : "var(--rc-amber)", fontSize: 15 }}>
            {ebitdaBreakeven ? "EBITDA positive in Y3" : "Not yet EBITDA positive"}
          </div>
          <div className="rc-mono" style={{ fontSize: 11, color: "var(--rc-dim)" }}>
            Y3 EBITDA {inr(Y3.ebitda)} on {inr(Y3.disbursedValue)} disbursed
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="rc-grid-auto" style={{ marginBottom: 22 }}>
        <KpiCard
          label="Disbursed"
          rows={years.map((y, i) => ({ year: `Y${i + 1}`, value: inr(y.disbursedValue), tone: CH.cyan }))}
        />
        <KpiCard
          label="Loans"
          rows={years.map((y, i) => ({ year: `Y${i + 1}`, value: num(y.disbursedCount) }))}
        />
        <KpiCard
          label="AUM (Total Book)"
          rows={years.map((y, i) => ({ year: `Y${i + 1}`, value: inr(y.aum) }))}
        />
        <KpiCard
          label="EBITDA"
          rows={years.map((y, i) => ({
            year: `Y${i + 1}`,
            value: inr(y.ebitda),
            tone: y.ebitda >= 0 ? CH.lime : CH.red,
            strong: i === 2,
          }))}
        />
      </div>

      {/* Charts */}
      <div className="rc-grid-2">
        <ChartCard title="Monthly Disbursement vs Collections">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
              <XAxis dataKey="m" tick={{ fill: CH.dim, fontSize: 10 }} interval={2} />
              <YAxis tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={crAxis} width={54} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="disbursed" name="Disbursed" stroke={CH.cyan} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="collections" name="Collections" stroke={CH.lime} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AUM (Total Book) Growth">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthly} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="pbook" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CH.cyan} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={CH.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
              <XAxis dataKey="m" tick={{ fill: CH.dim, fontSize: 10 }} interval={2} />
              <YAxis tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={crAxis} width={54} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => inr(v)} />
              <Area type="monotone" dataKey="book" name="Book" stroke={CH.cyan} strokeWidth={2} fill="url(#pbook)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="EBITDA by Year">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearRows} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
              <XAxis dataKey="year" tick={{ fill: CH.dim, fontSize: 11 }} />
              <YAxis tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={crAxis} width={54} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => inr(v)} cursor={{ fill: "var(--rc-panel2)", opacity: 0.4 }} />
              <Bar dataKey="ebitda" name="EBITDA" radius={[4, 4, 0, 0]}>
                {yearRows.map((r, i) => (
                  <Cell key={i} fill={r.ebitda >= 0 ? CH.lime : CH.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Income vs Expense by Year">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearRows} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
              <XAxis dataKey="year" tick={{ fill: CH.dim, fontSize: 11 }} />
              <YAxis tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={crAxis} width={54} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => inr(v)} cursor={{ fill: "var(--rc-panel2)", opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill={CH.cyan} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill={CH.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </Section>
  );
}
