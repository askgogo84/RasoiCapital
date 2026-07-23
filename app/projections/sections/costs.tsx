// app/projections/sections/costs.tsx — the four editable cost sections
// (Tech, Operations, Marketing, Set-Up). Each edits ModelState rows; the derived
// section total flows into ModelInputs and recalculates the model live.
"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { ModelState, Row } from "../state";
import { sumRows, opsTotals, groupTotals, techTotals } from "../state";
import { inr, crAxis, num } from "../format";
import { CH, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, Section, ChartCard, MoneyTable, NumCell } from "../ui";

type Setter = (fn: (s: ModelState) => ModelState) => void;

// Small "Y1 -> Y3 section total" bar.
function TotalBar({ totals, title }: { totals: number[]; title: string }) {
  const data = totals.map((t, i) => ({ year: `Y${i + 1}`, total: t }));
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
          <XAxis dataKey="year" tick={{ fill: CH.dim, fontSize: 11 }} />
          <YAxis tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={crAxis} width={54} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(v: any) => inr(v)} cursor={{ fill: "var(--rc-panel2)", opacity: 0.4 }} />
          <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CH.cyan} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// immutable row-cell updater for a top-level Row[] field
function editRows(setState: Setter, key: "tech" | "marketing" | "setup") {
  return (i: number, y: number, base: number) =>
    setState((s) => {
      const rows = (s[key] as Row[]).map((r) => ({ ...r, y: [...r.y] }));
      rows[i].y[y] = base;
      return { ...s, [key]: rows };
    });
}

function CostGrid({ table, chart }: { table: React.ReactNode; chart: React.ReactNode }) {
  return (
    <div className="rc-grid-sidebar-charts" style={{ alignItems: "start" }}>
      <div className="rc-panel">{table}</div>
      {chart}
    </div>
  );
}

export function TechCost({ state, setState }: { state: ModelState; setState: Setter }) {
  const totals = techTotals(state.tech);
  return (
    <Section id="tech" title="Tech Cost" eyebrow="Build & infrastructure">
      <CostGrid
        table={
          <>
            <div className="rc-panel-title">Tech Spend (₹ Lakh)</div>
            <MoneyTable rows={state.tech} onCell={editRows(setState, "tech")} unitScale={1} fmtTotal={inr} />
            <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 10 }}>
              Year-2/3 line values were distributed from the workbook's salary &amp; infra subtotal growth; every cell is editable.
            </p>
          </>
        }
        chart={<TotalBar totals={totals} title="Tech Total by Year" />}
      />
    </Section>
  );
}

export function Marketing({ state, setState }: { state: ModelState; setState: Setter }) {
  const totals = sumRows(state.marketing);
  return (
    <Section id="marketing" title="Marketing & Sales" eyebrow="Sponsorships & branding">
      <CostGrid
        table={
          <>
            <div className="rc-panel-title">Marketing Spend (₹ Lakh)</div>
            <MoneyTable rows={state.marketing} onCell={editRows(setState, "marketing")} unitScale={1e-5} fmtTotal={inr} />
          </>
        }
        chart={<TotalBar totals={totals} title="Marketing Total by Year" />}
      />
    </Section>
  );
}

export function Setup({ state, setState }: { state: ModelState; setState: Setter }) {
  const totals = sumRows(state.setup);
  return (
    <Section id="setup" title="Set-Up Cost" eyebrow="One-time & capex">
      <CostGrid
        table={
          <>
            <div className="rc-panel-title">Set-Up Spend (₹ Lakh)</div>
            <MoneyTable rows={state.setup} onCell={editRows(setState, "setup")} unitScale={1e-5} fmtTotal={inr} />
            <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 10 }}>
              Set-up cost feeds the post-setup EBITDA line (EBITDA after set-up), not the headline EBITDA.
            </p>
          </>
        }
        chart={<TotalBar totals={totals} title="Set-Up Total by Year" />}
      />
    </Section>
  );
}

// One read-only reference sub-table for an operations group (roles / variable /
// offices). Shows ₹ figures per year; roles also carry a ₹L rate, variable a
// rate label. These are the workbook breakdown — they do not drive the model.
function OpsGroup({ title, rows, rateCol }: { title: string; rows: Row[]; rateCol?: "lakh" | "label" }) {
  const totals = groupTotals(rows);
  return (
    <>
      <div className="rc-panel-title" style={{ marginTop: 6 }}>{title}</div>
      <div className="rc-table-scroll">
        <table className="rc-mtable">
          <thead>
            <tr>
              <th>Item</th>
              {rateCol && <th>Rate</th>}
              <th>Year 1</th>
              <th>Year 2</th>
              <th>Year 3</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.item}</td>
                {rateCol === "lakh" && <td className="rc-mono" style={{ color: "var(--rc-dim)" }}>₹{((r.rate ?? 0) / 1e5).toFixed(1)}L</td>}
                {rateCol === "label" && <td className="rc-mono" style={{ color: "var(--rc-dim)", fontSize: 11 }}>{r.rateLabel || "—"}</td>}
                {[0, 1, 2].map((y) => (
                  <td key={y} className="rc-mono">{inr(r.y[y] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>{title} subtotal</td>
              {rateCol && <td />}
              {totals.map((t, y) => (
                <td key={y} className="rc-mono" style={{ color: "var(--rc-dim)" }}>{inr(t)}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

export function Operations({ state, setState }: { state: ModelState; setState: Setter }) {
  const op = state.operations;
  const totals = opsTotals(op); // the model driver = workbook grand total

  const editTotal = (y: number, v: number) =>
    setState((s) => {
      const grandTotal = [...s.operations.grandTotal];
      grandTotal[y] = Math.max(0, v);
      return { ...s, operations: { ...s.operations, grandTotal } };
    });

  return (
    <Section id="operations" title="Operations" eyebrow="Headcount, variable & offices">
      <div className="rc-grid-sidebar-charts" style={{ alignItems: "start", marginBottom: 18 }}>
        <div className="rc-panel">
          <OpsGroup title="Roles (salaries)" rows={op.roles} rateCol="lakh" />
          <OpsGroup title="Variable costs" rows={op.variable} rateCol="label" />
          <OpsGroup title="Offices" rows={op.offices} />

          {/* Editable model driver: the workbook's authoritative operations total. */}
          <div className="rc-panel-title" style={{ marginTop: 22 }}>Operations Total — model driver (₹/yr)</div>
          <div className="rc-table-scroll">
            <table className="rc-mtable">
              <thead>
                <tr><th>Line</th><th>Year 1</th><th>Year 2</th><th>Year 3</th></tr>
              </thead>
              <tbody>
                <tr className="rc-row-sub">
                  <td>Operations Total (₹L)</td>
                  {[0, 1, 2].map((y) => (
                    <td key={y}><NumCell value={op.grandTotal[y]} onChange={(v) => editTotal(y, v)} scale={1e-5} step={1} dp={2} width={96} /></td>
                  ))}
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td>Operations Total (₹)</td>
                  {totals.map((t, y) => (
                    <td key={y} className="rc-mono" style={{ color: "var(--rc-cyan)" }}>{inr(t)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 10 }}>
            The three groups above are the workbook breakdown (reference). The model is driven by the
            workbook&apos;s authoritative Operations Total — the Y1 total sits below the group sum
            because the Director draw is excluded from Y1 in the workbook. Edit the total to flex operations spend.
          </p>
        </div>

        <TotalBar totals={totals} title="Operations Total by Year" />
      </div>
    </Section>
  );
}
