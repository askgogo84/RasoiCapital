// app/projections/sections/tables.tsx — Bad-Debt Provisioning (editable mix ->
// blended RBI rate -> provision) and City Break Up (editable allocation with a
// reconciliation warning; it drives nothing in the engine).
"use client";
import type { computeModel } from "@/lib/model/engine";
import type { ModelState } from "../state";
import { inr, num } from "../format";
import { Section, NumCell } from "../ui";

type Setter = (fn: (s: ModelState) => ModelState) => void;

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rc-panel"
      style={{ borderLeft: "3px solid var(--rc-amber)", padding: "10px 14px", fontSize: 12, color: "var(--rc-amber)", marginTop: 12 }}
    >
      ⚠ {children}
    </div>
  );
}

export function Provisioning({
  state, setState, outputs,
}: {
  state: ModelState;
  setState: Setter;
  outputs: ReturnType<typeof computeModel>;
}) {
  const blended = state.provisioning;
  const provision = outputs.years.map((y) => y.provision);
  const aum = outputs.years.map((y) => y.aum);

  const editRate = (y: number, v: number) =>
    setState((s) => {
      const p = [...s.provisioning] as [number, number, number];
      p[y] = Math.max(0, v);
      return { ...s, provisioning: p };
    });

  return (
    <Section id="provisioning" title="Bad-Debt Provisioning" eyebrow="RBI norms">
      <div className="rc-panel">
        <div className="rc-panel-title">Blended Provisioning Rate</div>
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
              <tr className="rc-row-sub">
                <td>Blended rate %</td>
                {[0, 1, 2].map((y) => (
                  <td key={y}><NumCell value={blended[y]} onChange={(v) => editRate(y, v)} scale={100} step={0.05} dp={3} width={80} /></td>
                ))}
              </tr>
              <tr>
                <td>AUM (year-end book)</td>
                {aum.map((a, y) => (
                  <td key={y} className="rc-mono" style={{ color: "var(--rc-dim)" }}>{inr(a)}</td>
                ))}
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>Provision (₹)</td>
                {provision.map((p, y) => (
                  <td key={y} className="rc-mono" style={{ color: "var(--rc-fg)" }}>{inr(p)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 10 }}>
          Provision = year-end total book (AUM) × blended rate. The blended rate follows RBI provisioning
          norms (standard / sub-standard / doubtful &amp; loss) as computed in the workbook; edit it to stress the book.
        </p>
      </div>
    </Section>
  );
}

export function Cities({ state, setState }: { state: ModelState; setState: Setter }) {
  const cities = state.cities;
  const cityTotals = [0, 1, 2].map((y) => cities.reduce((s, c) => s + (c.loans[y] ?? 0), 0));
  const caseTotals = [0, 1, 2].map((y) => state.casesPerMonth.slice(y * 12, y * 12 + 12).reduce((a, b) => a + b, 0));
  const mismatch = [0, 1, 2].some((y) => cityTotals[y] !== caseTotals[y]);

  const editLoan = (i: number, y: number, v: number) =>
    setState((s) => {
      const c = s.cities.map((x) => ({ ...x, loans: [...x.loans] }));
      c[i].loans[y] = Math.max(0, Math.round(v));
      return { ...s, cities: c };
    });

  return (
    <Section id="cities" title="City Break Up" eyebrow="Loan allocation">
      <div className="rc-panel">
        <div className="rc-panel-title">Loans by City</div>
        <div className="rc-table-scroll">
          <table className="rc-mtable">
            <thead>
              <tr>
                <th>City</th>
                <th>Year 1</th>
                <th>Year 2</th>
                <th>Year 3</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c, i) => (
                <tr key={i}>
                  <td>{c.city}</td>
                  {[0, 1, 2].map((y) => (
                    <td key={y}><NumCell value={c.loans[y]} onChange={(v) => editLoan(i, y, v)} step={1000} dp={0} width={78} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>City total</td>
                {cityTotals.map((t, y) => (
                  <td key={y} className="rc-mono" style={{ color: cityTotals[y] === caseTotals[y] ? "var(--rc-cyan)" : "var(--rc-amber)" }}>{num(t)}</td>
                ))}
              </tr>
              <tr>
                <td>Σ cases / year</td>
                {caseTotals.map((t, y) => (
                  <td key={y} className="rc-mono" style={{ color: "var(--rc-dim)" }}>{num(t)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 10 }}>
          The city break-up is an allocation view — the engine is driven by cases/month (Loan Engine), not by this table. Sheet allocates at 1000-loan granularity.
        </p>
        {mismatch && (
          <Warn>
            City totals don&apos;t match the loans disbursed per year ({caseTotals.map((t, y) => `Y${y + 1} ${num(cityTotals[y])} vs ${num(t)}`).join(" · ")}). This is a reconciliation note only — it doesn&apos;t change the model.
          </Warn>
        )}
      </div>
    </Section>
  );
}
