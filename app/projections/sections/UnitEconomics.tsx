// app/projections/sections/UnitEconomics.tsx — per-loan margin view from the V3
// workbook: income (interest + PF) minus direct cost = contribution margin.
// Read-only; the figures are a fixed unit-economics reference, expressed as a
// percentage of the disbursed amount.
"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { WORKBOOK } from "@/lib/model/defaults";
import { pct } from "../format";
import { CH, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, Section, ChartCard } from "../ui";

const ue: any = (WORKBOOK as any).unitEconomics;

// One % breakdown table (Income or Direct Cost).
function Breakdown({ title, lines, total, totalLabel, accent }: {
  title: string;
  lines: [string, number][];
  total: number;
  totalLabel: string;
  accent: string;
}) {
  return (
    <div className="rc-table-scroll">
      <div className="rc-panel-title">{title}</div>
      <table className="rc-mtable">
        <thead>
          <tr><th>Component</th><th>% of loan</th></tr>
        </thead>
        <tbody>
          {lines.map(([label, v]) => (
            <tr key={label}>
              <td>{label}</td>
              <td className="rc-mono">{pct(v, 2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="rc-row-sub">
            <td>{totalLabel}</td>
            <td className="rc-mono" style={{ color: accent }}>{pct(total, 2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function UnitEconomics() {
  const chartData = [
    { name: "Income", pct: ue.income.total * 100, fill: CH.cyan },
    { name: "Direct Cost", pct: ue.directCost.total * 100, fill: CH.amber },
    { name: "Contribution", pct: ue.contributionMargin * 100, fill: CH.lime },
  ];

  return (
    <Section id="unit-economics" title="Unit Economics" eyebrow="Per-loan margin">
      <div className="rc-grid-sidebar-charts" style={{ alignItems: "start" }}>
        <div className="rc-panel">
          <div style={{ display: "grid", gap: 18 }}>
            <Breakdown
              title="Income"
              lines={[
                ["Interest", ue.income.interestRate],
                ["Processing Fee", ue.income.pf],
              ]}
              total={ue.income.total}
              totalLabel="Total Income"
              accent="var(--rc-cyan)"
            />
            <Breakdown
              title="Direct Cost"
              lines={[
                ["Cost of Capital", ue.directCost.costOfCapital],
                ["Tech", ue.directCost.tech],
                ["Collection", ue.directCost.collection],
                ["Opex", ue.directCost.opex],
                ["Bad Debts", ue.directCost.badDebts],
              ]}
              total={ue.directCost.total}
              totalLabel="Total Direct Cost"
              accent="var(--rc-amber)"
            />
          </div>
          <div
            className="rc-panel"
            style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: "3px solid var(--rc-lime)", padding: "12px 16px" }}
          >
            <span style={{ fontWeight: 700, color: "var(--rc-lime)", fontSize: 15 }}>Contribution Margin</span>
            <span className="rc-mono" style={{ fontWeight: 700, color: "var(--rc-lime)", fontSize: 18 }}>{pct(ue.contributionMargin, 2)}</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 10 }}>
            Per-loan economics as a share of the disbursed amount: {pct(ue.income.total, 1)} income −
            {" "}{pct(ue.directCost.total, 1)} direct cost = {pct(ue.contributionMargin, 1)} contribution margin.
          </p>
        </div>

        <ChartCard title="Income → Direct Cost → Contribution (% of loan)">
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
