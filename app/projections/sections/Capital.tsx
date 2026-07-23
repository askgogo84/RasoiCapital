// app/projections/sections/Capital.tsx — Capital Allocation panel pinned at the
// top of the Dashboard. Shows how the raise splits into lending deposit (equity
// base) vs cash runway, the NBFC-levered lending capacity, and the Year-1 cash
// position. The allocation inputs are editable and live-linked; they are runway
// inputs only and do NOT feed computeModel.
"use client";
import type { computeModel } from "@/lib/model/engine";
import { deriveCapital, type ModelState } from "../state";
import type { ModelInputs } from "@/lib/model/engine";
import { inr } from "../format";
import { NumCell } from "../ui";

type Setter = (fn: (s: ModelState) => ModelState) => void;

// An editable ₹ (Cr) input card in the panel grid.
function EditCard({ label, value, onChange, sub, step = 1, dp = 1, scale = 1e-7, unit = "₹ Cr" }: {
  label: string; value: number; onChange: (v: number) => void; sub: React.ReactNode;
  step?: number; dp?: number; scale?: number; unit?: string;
}) {
  return (
    <div className="rc-panel" style={{ padding: "14px 16px" }}>
      <div className="rc-panel-title" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <NumCell value={value} onChange={onChange} scale={scale} step={step} dp={dp} width={110} />
        <span className="rc-mono" style={{ fontSize: 12, color: "var(--rc-dim)" }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 8 }}>{sub}</div>
    </div>
  );
}

// A derived (read-only) ₹ figure card.
function DerivedCard({ label, value, sub, tone }: {
  label: string; value: number; sub: React.ReactNode; tone?: string;
}) {
  return (
    <div className="rc-panel" style={{ padding: "14px 16px" }}>
      <div className="rc-panel-title" style={{ marginBottom: 8 }}>{label}</div>
      <div className="rc-mono" style={{ fontSize: 20, fontWeight: 700, color: tone || "var(--rc-fg)" }}>{inr(value)}</div>
      <div style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 8 }}>{sub}</div>
    </div>
  );
}

// A tiny two-row stacked bar: raise = deposit + reserve, and reserve → cash-left.
function CapitalBar({ deposit, reserve, cashLeft, burn }: {
  deposit: number; reserve: number; cashLeft: number; burn: number;
}) {
  const raise = deposit + reserve || 1;
  const seg = (v: number, color: string, label: string) =>
    v > 0 ? (
      <div title={`${label}: ${inr(v)}`} style={{ width: `${(v / raise) * 100}%`, background: color, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", whiteSpace: "nowrap" }}>
        <span className="rc-mono" style={{ fontSize: 10, color: "#04121a", padding: "0 4px" }}>{label}</span>
      </div>
    ) : null;
  const barStyle: React.CSSProperties = { display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "var(--rc-panel2)" };
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
      <div>
        <div style={{ fontSize: 10, color: "var(--rc-dim)", marginBottom: 3 }}>Raise = Lending deposit + Cash reserve</div>
        <div style={barStyle}>
          {seg(deposit, "var(--rc-cyan)", "Deposit")}
          {seg(reserve, "var(--rc-amber)", "Reserve")}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: "var(--rc-dim)", marginBottom: 3 }}>Cash reserve → after Year 1</div>
        <div style={{ ...barStyle, width: `${(reserve / raise) * 100}%`, minWidth: 60 }}>
          {seg(Math.max(0, cashLeft), "var(--rc-lime)", "Cash left")}
          {seg(Math.max(0, burn), "var(--rc-red)", "Y1 burn")}
        </div>
      </div>
    </div>
  );
}

export function CapitalAllocation({
  state, setState, inputs, outputs,
}: {
  state: ModelState;
  setState: Setter;
  inputs: ModelInputs;
  outputs: ReturnType<typeof computeModel>;
}) {
  const cap = deriveCapital(inputs, outputs, state.allocation);
  const setAlloc = (k: keyof ModelState["allocation"]) => (v: number) =>
    setState((s) => ({ ...s, allocation: { ...s.allocation, [k]: Math.max(0, v) } }));

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="rc-eyebrow" style={{ marginBottom: 10 }}>Capital allocation · raise → lending + runway</div>
      <div className="rc-grid-auto">
        <EditCard
          label="Total Raise"
          value={cap.raise}
          onChange={setAlloc("raise")}
          sub="equity round raised"
        />
        <EditCard
          label="Lending Deposit"
          value={cap.lendingDeposit}
          onChange={setAlloc("lendingDeposit")}
          sub="equity base · × multiple below"
        />
        <DerivedCard
          label="Lending Capacity"
          value={cap.lendingCapacity}
          tone={cap.capacityShort ? "var(--rc-amber)" : "var(--rc-cyan)"}
          sub={
            <span>
              deposit ×{" "}
              <NumCell value={cap.leverageMultiple} onChange={setAlloc("leverageMultiple")} scale={1} step={0.5} dp={1} width={52} />
              {" "}leverage
            </span>
          }
        />
        <DerivedCard label="Cash Reserve" value={cap.cashReserve} tone="var(--rc-fg)" sub="raise − deposit" />
        <DerivedCard label="Total Y1 Expense" value={cap.totalExpenseY1} tone="var(--rc-fg)" sub="all-in accrual incl provision + set-up" />
        <DerivedCard
          label="Cash Left after Y1"
          value={cap.cashLeftAfterY1}
          tone={cap.cashLeftAfterY1 >= 0 ? "var(--rc-lime)" : "var(--rc-red)"}
          sub="reserve − net cash burn"
        />
      </div>

      {cap.capacityShort && (
        <div className="rc-panel" style={{ borderLeft: "3px solid var(--rc-amber)", padding: "10px 14px", fontSize: 12, color: "var(--rc-amber)", marginTop: 12 }}>
          ⚠ Lending capacity {inr(cap.lendingCapacity)} is below Year-1 disbursal {inr(cap.disbursedY1)} — increase the deposit.
        </div>
      )}

      <CapitalBar deposit={cap.lendingDeposit} reserve={cap.cashReserve} cashLeft={cap.cashLeftAfterY1} burn={cap.netCashBurnY1} />

      <p style={{ fontSize: 11, color: "var(--rc-dim)", marginTop: 12, lineHeight: 1.6 }}>
        Cash burn ({inr(cap.netCashBurnY1)}) is less than total expense ({inr(cap.totalExpenseY1)}) because the{" "}
        {inr(cap.provisionY1)} provision is a non-cash accrual and the book earns {inr(cap.incomeY1)} of interest + fees in Year 1.
      </p>
    </div>
  );
}
