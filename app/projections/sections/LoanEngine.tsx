// app/projections/sections/LoanEngine.tsx — editable loan drivers + the
// 36-month cases ramp. Everything here feeds ModelInputs and recalculates the
// whole model live.
"use client";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import type { computeModel } from "@/lib/model/engine";
import type { ModelState } from "../state";
import { inr, crAxis, num } from "../format";
import { CH, tooltipStyle, tooltipLabelStyle, tooltipItemStyle, Section, ChartCard, DriverInput, NumCell } from "../ui";

type Setter = (fn: (s: ModelState) => ModelState) => void;

// A per-year (Y1/Y2/Y3) row of numeric inputs for a [number,number,number] driver.
function YearTriple({
  label, values, onChange, scale = 1, step, dp, unit,
}: {
  label: string;
  values: number[];
  onChange: (year: number, v: number) => void;
  scale?: number;
  step: number;
  dp: number;
  unit: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--rc-dim)" }}>{label}</span>
        <span className="rc-mono" style={{ fontSize: 11, color: "var(--rc-dim)" }}>{unit}</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((y) => (
          <div key={y} style={{ flex: 1, minWidth: 0 }}>
            <div className="rc-mono" style={{ fontSize: 10, color: "var(--rc-dim)", marginBottom: 3 }}>Y{y + 1}</div>
            <NumCell value={values[y]} onChange={(v) => onChange(y, v)} scale={scale} step={step} dp={dp} width={999} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoanEngine({
  state, setState, outputs,
}: {
  state: ModelState;
  setState: Setter;
  outputs: ReturnType<typeof computeModel>;
}) {
  const set = (k: keyof ModelState) => (v: number) => setState((s) => ({ ...s, [k]: v }));
  const setTicket = (y: number, v: number) =>
    setState((s) => {
      const t = [...s.ticketByYear] as [number, number, number];
      t[y] = Math.max(0, Math.round(v));
      return { ...s, ticketByYear: t };
    });
  const setCoC = (y: number, v: number) =>
    setState((s) => {
      const c = [...s.costOfCapitalByYear] as [number, number, number];
      c[y] = Math.max(0, v);
      return { ...s, costOfCapitalByYear: c };
    });
  const setCase = (idx: number, v: number) =>
    setState((s) => {
      const c = [...s.casesPerMonth];
      c[idx] = Math.max(0, Math.round(v));
      return { ...s, casesPerMonth: c };
    });

  const yearTotals = [0, 1, 2].map((y) =>
    state.casesPerMonth.slice(y * 12, y * 12 + 12).reduce((a, b) => a + b, 0),
  );

  const chartData = outputs.monthly.map((r) => ({ m: `M${r.month}`, cases: r.cases, interest: r.interestIncome }));

  return (
    <Section id="loan-engine" title="Loan Engine" eyebrow="Drivers & cases ramp">
      <div className="rc-grid-sidebar-charts" style={{ marginBottom: 18 }}>
        {/* Drivers */}
        <div className="rc-panel">
          <div className="rc-panel-title">Drivers</div>
          <YearTriple label="Avg ticket by year" values={state.ticketByYear} onChange={setTicket} scale={1e-5} step={0.5} dp={2} unit="₹ Lakh" />
          <YearTriple label="Cost of capital by year" values={state.costOfCapitalByYear} onChange={setCoC} scale={100} step={0.25} dp={2} unit="% p.a." />
          <DriverInput label="Interest rate (p.a.)" value={state.annualRate} onChange={set("annualRate")} min={0.12} max={0.30} step={0.005} unit="%" scale={100} />
          <DriverInput label="Tenure" value={state.tenureMonths} onChange={(v) => setState((s) => ({ ...s, tenureMonths: Math.max(1, Math.round(v)) }))} min={6} max={36} step={1} unit="mo" dp={0} />
          <DriverInput label="Processing fee" value={state.processingFeePct} onChange={set("processingFeePct")} min={0} max={0.05} step={0.0025} unit="%" scale={100} />
          <div className="rc-mono" style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 6, lineHeight: 1.7 }}>
            EMI @ current terms:{" "}
            {outputs.emiByYear.map((e, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: "var(--rc-dim)" }}> · </span>}
                Y{i + 1} <span style={{ color: "var(--rc-cyan)" }}>{inr(e)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 36-month cases grid: 12 rows × 3 year columns */}
        <div className="rc-panel">
          <div className="rc-panel-title">Cases Disbursed / Month (36 months)</div>
          <div className="rc-table-scroll">
            <table className="rc-mtable">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Year 1</th>
                  <th>Year 2</th>
                  <th>Year 3</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, m) => (
                  <tr key={m}>
                    <td className="rc-mono">M{m + 1}</td>
                    {[0, 1, 2].map((y) => {
                      const idx = y * 12 + m;
                      return (
                        <td key={y}>
                          <NumCell value={state.casesPerMonth[idx]} onChange={(v) => setCase(idx, v)} step={50} dp={0} width={78} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  {yearTotals.map((t, y) => (
                    <td key={y} className="rc-mono" style={{ color: "var(--rc-cyan)" }}>{num(t)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <ChartCard title="Cases Ramp & Monthly Interest Income">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CH.line} />
            <XAxis dataKey="m" tick={{ fill: CH.dim, fontSize: 10 }} interval={2} />
            <YAxis yAxisId="cases" tick={{ fill: CH.dim, fontSize: 10 }} width={44} />
            <YAxis yAxisId="int" orientation="right" tick={{ fill: CH.dim, fontSize: 10 }} tickFormatter={crAxis} width={54} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              formatter={(v: any, n: any) => (n === "Cases" ? num(v) : inr(v))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="cases" dataKey="cases" name="Cases" fill={CH.cyan} opacity={0.55} radius={[3, 3, 0, 0]} />
            <Line yAxisId="int" type="monotone" dataKey="interest" name="Interest Income" stroke={CH.amber} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </Section>
  );
}
