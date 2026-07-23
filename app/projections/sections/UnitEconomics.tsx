// app/projections/sections/UnitEconomics.tsx — per-loan margin view, BY DISBURSAL
// YEAR (Y1/Y2/Y3 columns). Income (interest + PF) and Cost of Capital are read
// LIVE from ModelInputs, so Loan Engine edits flow straight through here. Tech /
// collection / opex / bad-debts are EDITABLE per-loan variable-cost assumptions
// (state.unitEconAssumptions) — flat across years, and NOT fed to the engine, so
// editing them moves this view only, never the P&L / EBITDA.
"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { ModelInputs } from "@/lib/model/engine";
import { deriveUnitEconomics, type UnitEcoCol, type ModelState, type UnitEconAssumptions } from "../state";
import { pct } from "../format";
import { CH, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, Section, ChartCard, NumCell } from "../ui";

type Setter = (fn: (s: ModelState) => ModelState) => void;
type Kind = "head" | "line" | "sub" | "margin";
// [label, selector, kind, editable-assumption key]
const ROWS: [string, (c: UnitEcoCol) => number, Kind, keyof UnitEconAssumptions | undefined][] = [
  ["INCOME", () => NaN, "head", undefined],
  ["Interest", (c) => c.interest, "line", undefined],
  ["Processing Fee", (c) => c.pf, "line", undefined],
  ["Total Income", (c) => c.totalIncome, "sub", undefined],
  ["DIRECT COST", () => NaN, "head", undefined],
  ["Cost of Capital", (c) => c.coc, "line", undefined],
  ["Tech", (c) => c.tech, "line", "tech"],
  ["Collection", (c) => c.collection, "line", "collection"],
  ["Opex", (c) => c.opex, "line", "opex"],
  ["Bad Debts", (c) => c.badDebts, "line", "badDebts"],
  ["Total Direct Cost", (c) => c.totalDirectCost, "sub", undefined],
  ["Contribution Margin", (c) => c.contributionMargin, "margin", undefined],
];

export function UnitEconomics({
  inputs, state, setState,
}: {
  inputs: ModelInputs;
  state: ModelState;
  setState: Setter;
}) {
  const ue = deriveUnitEconomics(inputs, state.unitEconAssumptions);
  const cols: [string, UnitEcoCol][] = [["Year 1", ue.y1], ["Year 2", ue.y2], ["Year 3", ue.y3]];

  // The four assumptions are flat across years, so one value drives all three
  // columns — edit it in whichever column you're looking at, they stay in sync.
  const setAssumption = (k: keyof UnitEconAssumptions) => (v: number) =>
    setState((s) => ({ ...s, unitEconAssumptions: { ...s.unitEconAssumptions, [k]: Math.max(0, v) } }));

  // tri-color bar reflects Year 1
  const chartData = [
    { name: "Income", pct: ue.y1.totalIncome * 100, fill: CH.cyan },
    { name: "Direct Cost", pct: ue.y1.totalDirectCost * 100, fill: CH.amber },
    { name: "Contribution", pct: ue.y1.contributionMargin * 100, fill: CH.lime },
  ];

  return (
    <Section id="unit-economics" title="Unit Economics" eyebrow="Per-loan margin by disbursal year">
      <div className="rc-grid-sidebar-charts" style={{ alignItems: "start" }}>
        <div className="rc-panel">
          <div className="rc-panel-title">Per loan · % of disbursed</div>
          <div className="rc-table-scroll">
            <table className="rc-mtable">
              <thead>
                <tr>
                  <th>Component</th>
                  {cols.map(([label]) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, sel, kind, editKey]) => {
                  if (kind === "head") {
                    return (
                      <tr key={label} className="rc-row-head">
                        <td colSpan={4}>{label}</td>
                      </tr>
                    );
                  }
                  const isSub = kind === "sub" || kind === "margin";
                  const tone =
                    kind === "margin"
                      ? "var(--rc-lime)"
                      : label === "Cost of Capital"
                      ? "var(--rc-cyan)"
                      : "var(--rc-fg)";
                  return (
                    <tr key={label} className={isSub ? "rc-row-sub" : undefined}>
                      <td>
                        {label}
                        {editKey && (
                          <span style={{ fontSize: 10, color: "var(--rc-dim)", marginLeft: 6 }}>editable assumption</span>
                        )}
                      </td>
                      {cols.map(([clabel, c]) =>
                        editKey ? (
                          <td key={clabel}>
                            <NumCell value={sel(c)} onChange={setAssumption(editKey)} scale={100} step={0.25} dp={2} width={72} />
                          </td>
                        ) : (
                          <td key={clabel} className="rc-mono" style={{ color: tone, fontWeight: isSub ? 700 : 400 }}>
                            {pct(sel(c), 2)}
                          </td>
                        ),
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 10, lineHeight: 1.6 }}>
            Per-loan economics by disbursal year. Interest, processing fee and cost of capital are read live
            from the Loan Engine (cost of capital steps down as the book seasons:
            {" "}{pct(ue.y1.coc, 1)} → {pct(ue.y2.coc, 1)} → {pct(ue.y3.coc, 1)}). Tech, collection, opex and bad-debts
            are editable per-loan variable-cost assumptions (flat across years) — they tune this margin view only
            and do not change the P&amp;L / EBITDA, which come from the cost sheets.
          </p>
        </div>

        <ChartCard title="Income → Direct Cost → Contribution (Year 1 shown)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
              <XAxis dataKey="name" tick={{ fill: CH.dim, fontSize: 11 }} />
              <YAxis tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} width={40} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => `${(+v).toFixed(2)}%`} cursor={{ fill: "var(--rc-panel2)", opacity: 0.4 }} />
              <Bar dataKey="pct" name="% of loan" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </Section>
  );
}
