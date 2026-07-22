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

export function LoanEngine({
  state, setState, outputs,
}: {
  state: ModelState;
  setState: Setter;
  outputs: ReturnType<typeof computeModel>;
}) {
  const set = (k: keyof ModelState) => (v: number) => setState((s) => ({ ...s, [k]: v }));
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
          <DriverInput label="Avg ticket" value={state.ticket} onChange={set("ticket")} min={100000} max={1000000} step={25000} unit="₹" />
          <DriverInput label="Interest rate (p.a.)" value={state.annualRate} onChange={set("annualRate")} min={0.12} max={0.30} step={0.005} unit="%" scale={100} />
          <DriverInput label="Tenure" value={state.tenureMonths} onChange={(v) => setState((s) => ({ ...s, tenureMonths: Math.max(1, Math.round(v)) }))} min={6} max={36} step={1} unit="mo" dp={0} />
          <DriverInput label="Processing fee" value={state.processingFeePct} onChange={set("processingFeePct")} min={0} max={0.05} step={0.0025} unit="%" scale={100} />
          <DriverInput label="Cost of capital (p.a.)" value={state.costOfCapitalPct} onChange={set("costOfCapitalPct")} min={0.06} max={0.18} step={0.005} unit="%" scale={100} />
          <DriverInput label="CAC" value={state.cacPct} onChange={set("cacPct")} min={0} max={0.05} step={0.0025} unit="%" scale={100} />
          <div className="rc-mono" style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 6 }}>
            EMI @ current terms: <span style={{ color: "var(--rc-cyan)" }}>{inr(outputs.emi)}</span>
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
