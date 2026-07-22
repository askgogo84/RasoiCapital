// app/projections/sections/costs.tsx — the four editable cost sections
// (Tech, Operations, Marketing, Set-Up). Each edits ModelState rows; the derived
// section total flows into ModelInputs and recalculates the model live.
"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import type { ModelState, Row } from "../state";
import { sumRows, opsTotals, rolesRunRate, techTotals } from "../state";
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

export function Operations({ state, setState }: { state: ModelState; setState: Setter }) {
  const op = state.operations;
  const totals = opsTotals(op);
  const runRate = rolesRunRate(op.roles);

  const editRole = (i: number, field: "rate" | "heads", y: number, v: number) =>
    setState((s) => {
      const roles = s.operations.roles.map((r) => ({ ...r, heads: [...r.heads] }));
      if (field === "rate") roles[i].rate = v;
      else roles[i].heads[y] = Math.max(0, Math.round(v));
      return { ...s, operations: { ...s.operations, roles } };
    });
  const editOverhead = (i: number, y: number, base: number) =>
    setState((s) => {
      const overheads = s.operations.overheads.map((r) => ({ ...r, y: [...r.y] }));
      overheads[i].y[y] = base;
      return { ...s, operations: { ...s.operations, overheads } };
    });
  const editSalary = (y: number, base: number) =>
    setState((s) => {
      const salariesBooked = [...s.operations.salariesBooked];
      salariesBooked[y] = base;
      return { ...s, operations: { ...s.operations, salariesBooked } };
    });
  const applyRunRate = () =>
    setState((s) => ({ ...s, operations: { ...s.operations, salariesBooked: rolesRunRate(s.operations.roles) } }));

  return (
    <Section id="operations" title="Operations" eyebrow="Headcount & overheads">
      <div className="rc-grid-sidebar-charts" style={{ alignItems: "start", marginBottom: 18 }}>
        <div className="rc-panel">
          {/* Roles */}
          <div className="rc-panel-title">Headcount Plan (year-end heads · run-rate reference)</div>
          <div className="rc-table-scroll">
            <table className="rc-mtable">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Rate ₹L</th>
                  <th>H1</th>
                  <th>H2</th>
                  <th>H3</th>
                </tr>
              </thead>
              <tbody>
                {op.roles.map((r, i) => (
                  <tr key={i}>
                    <td>{r.role}</td>
                    <td><NumCell value={r.rate} onChange={(v) => editRole(i, "rate", 0, v)} scale={1e-5} step={1} dp={2} width={72} /></td>
                    {[0, 1, 2].map((y) => (
                      <td key={y}><NumCell value={r.heads[y]} onChange={(v) => editRole(i, "heads", y, v)} step={1} dp={0} width={56} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Run-rate (₹/yr)</td>
                  <td className="rc-mono" style={{ color: "var(--rc-dim)" }} />
                  {runRate.map((t, y) => (
                    <td key={y} className="rc-mono" style={{ color: "var(--rc-amber)" }}>{inr(t)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Booked salaries + overheads */}
          <div className="rc-panel-title" style={{ marginTop: 22 }}>Salaries Booked &amp; Overheads (₹ Lakh)</div>
          <div className="rc-table-scroll">
            <table className="rc-mtable">
              <thead>
                <tr>
                  <th>Item</th><th>Year 1 ₹L</th><th>Year 2 ₹L</th><th>Year 3 ₹L</th>
                </tr>
              </thead>
              <tbody>
                <tr className="rc-row-sub">
                  <td>Salaries (booked)</td>
                  {[0, 1, 2].map((y) => (
                    <td key={y}><NumCell value={op.salariesBooked[y]} onChange={(v) => editSalary(y, v)} scale={1e-5} step={1} dp={2} width={88} /></td>
                  ))}
                </tr>
                {op.overheads.map((r, i) => (
                  <tr key={i}>
                    <td>{r.item}</td>
                    {[0, 1, 2].map((y) => (
                      <td key={y}><NumCell value={r.y[y]} onChange={(v) => editOverhead(i, y, v)} scale={1e-5} step={1} dp={2} width={88} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Operations Total</td>
                  {totals.map((t, y) => (
                    <td key={y} className="rc-mono" style={{ color: "var(--rc-cyan)" }}>{inr(t)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <button className="rc-btn rc-btn-ghost" style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={applyRunRate}>
              Set booked salaries = run-rate
            </button>
            <span style={{ fontSize: 11, color: "var(--rc-dim)" }}>
              Booked salary ramps below the year-end run-rate; both are editable.
            </span>
          </div>
        </div>

        <TotalBar totals={totals} title="Operations Total by Year" />
      </div>
    </Section>
  );
}
