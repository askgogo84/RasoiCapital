// app/projections/sections/PnL.tsx — read-only computed P&L (Y1/Y2/Y3) in the
// workbook's line order, plus a per-year contribution waterfall.
"use client";
import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { computeModel } from "@/lib/model/engine";
import type { YearPL } from "@/lib/model/engine";
import { inr, crAxis } from "../format";
import { CH, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, Section, ChartCard } from "../ui";

type Kind = "head" | "line" | "sub" | "ebitda";
const LINES: [string, (y: YearPL) => number, Kind][] = [
  ["Disbursed", (y) => y.disbursedValue, "head"],
  ["Interest Income", (y) => y.interestIncome, "line"],
  ["Processing Fee", (y) => y.processingFee, "line"],
  ["Total Income", (y) => y.totalIncome, "sub"],
  ["Cost of Capital", (y) => y.costOfCapital, "line"],
  ["CAC", (y) => y.cac, "line"],
  ["Direct Cost", (y) => y.directCost, "sub"],
  ["Contribution", (y) => y.contribution, "sub"],
  ["Tech", (y) => y.techCost, "line"],
  ["Operations", (y) => y.operationsCost, "line"],
  ["Marketing", (y) => y.marketingCost, "line"],
  ["Provision", (y) => y.provision, "line"],
  ["Expense", (y) => y.expense, "sub"],
  ["EBITDA", (y) => y.ebitda, "ebitda"],
];

export function PnL({ outputs }: { outputs: ReturnType<typeof computeModel> }) {
  const years = outputs.years;
  const [yi, setYi] = useState(2); // waterfall year, default Y3

  return (
    <Section id="pnl" title="P&L" eyebrow="Computed · read-only">
      <div className="rc-grid-sidebar-charts" style={{ alignItems: "start" }}>
        <div className="rc-panel">
          <div className="rc-panel-title">Profit &amp; Loss (₹)</div>
          <div className="rc-table-scroll">
            <table className="rc-mtable">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Year 1</th>
                  <th>Year 2</th>
                  <th>Year 3</th>
                </tr>
              </thead>
              <tbody>
                {LINES.map(([label, fn, kind]) => (
                  <tr key={label} className={kind === "sub" || kind === "ebitda" ? "rc-row-sub" : undefined}>
                    <td style={{ color: kind === "head" ? "var(--rc-dim)" : "var(--rc-fg)" }}>{label}</td>
                    {years.map((y, i) => {
                      const v = fn(y);
                      const tone =
                        kind === "ebitda" ? (v >= 0 ? "var(--rc-lime)" : "var(--rc-red)") : "var(--rc-fg)";
                      return (
                        <td key={i} className="rc-mono" style={{ color: tone }}>{inr(v)}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["Year 1", "Year 2", "Year 3"].map((lbl, i) => (
              <button
                key={i}
                className={`rc-btn ${yi === i ? "" : "rc-btn-ghost"}`}
                style={{ width: "auto", padding: "6px 14px", fontSize: 13 }}
                onClick={() => setYi(i)}
              >
                {lbl}
              </button>
            ))}
          </div>
          <Waterfall y={years[yi]} />
        </div>
      </div>
    </Section>
  );
}

// Contribution waterfall: Income walks down through each cost to EBITDA.
function Waterfall({ y }: { y: YearPL }) {
  const steps: [string, number][] = [
    ["Income", y.totalIncome],
    ["Direct Cost", -y.directCost],
    ["Tech", -y.techCost],
    ["Ops", -y.operationsCost],
    ["Marketing", -y.marketingCost],
    ["Provision", -y.provision],
  ];
  let prev = 0;
  const data = steps.map(([name, delta]) => {
    const next = prev + delta;
    const lo = Math.min(prev, next);
    const hi = Math.max(prev, next);
    prev = next;
    return { name, base: lo, val: hi - lo, up: delta >= 0 };
  });
  // final EBITDA marker (prev == ebitda here)
  const eb = prev;
  data.push({ name: "EBITDA", base: Math.min(0, eb), val: Math.abs(eb), up: eb >= 0 });

  return (
    <ChartCard title="Contribution Waterfall">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
          <XAxis dataKey="name" tick={{ fill: CH.dim, fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={crAxis} width={54} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            formatter={(v: any, n: any) => (n === "val" ? inr(v) : null)}
            cursor={{ fill: "var(--rc-panel2)", opacity: 0.4 }}
          />
          <Bar dataKey="base" stackId="w" fill="transparent" />
          <Bar dataKey="val" stackId="w" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={i === 0 ? CH.cyan : d.name === "EBITDA" ? (d.up ? CH.lime : CH.red) : CH.amber} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
