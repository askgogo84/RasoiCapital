// app/projections/state.ts — the single editable ModelState for /projections,
// plus deriveInputs() which folds the editable cost tables into the ModelInputs
// consumed by lib/model/engine.ts.
//
// deriveInputs(DEFAULT_STATE) reproduces DEFAULT_INPUTS (and therefore the
// golden-master numbers) exactly, via these reconciliation rules — each proven
// against model_defaults.json:
//   tech        : Σ of the SUBTOTAL rows × 1e5   (leaf rows are read-only detail;
//                 sheet only carries Y2/Y3 growth on the subtotals)
//   operations  : Σ overheads + salariesBooked   (roles rate×heads is a year-end
//                 run-rate reference; booked salary ramps below it)
//   marketing   : Σ items
//   setup       : Σ items   (NB: the workbook's own setup total is self-inconsistent
//                 at Y2 — ₹1.65 Cr line vs ₹4.4 Cr of rows; we use the row sum so the
//                 table reconciles. Setup only feeds ebitdaAfterSetup, not headline EBITDA.)
//   provision   : blended[y] = Σ mix.rate × mix.share[y]
import type { ModelInputs } from "@/lib/model/engine";
import { DEFAULT_INPUTS, WORKBOOK } from "@/lib/model/defaults";

export type Y3 = [number, number, number];
export type Row = { item: string; y: number[]; header?: boolean }; // y = [Y1,Y2,Y3]
export type Role = { role: string; rate: number; heads: number[] };
export type City = { city: string; loans: number[] };
export type MixRow = { type: string; rate: number; share: number[] };

export interface OperationsState {
  roles: Role[];
  overheads: Row[];
  salariesBooked: number[]; // booked salary cost per year (ramped, editable)
}

export interface ModelState {
  // ---- Loan engine drivers ----
  casesPerMonth: number[]; // length 36
  ticket: number;
  annualRate: number;
  tenureMonths: number;
  processingFeePct: number;
  costOfCapitalPct: number;
  cacPct: number;
  // ---- Editable cost tables ----
  tech: Row[]; // lakhs; includes header/leaf/subtotal rows
  operations: OperationsState;
  marketing: Row[];
  setup: Row[];
  cities: City[];
  provisioning: MixRow[];
}

const w: any = WORKBOOK;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

const overheadsSum = (y: number) =>
  w.operations.overheads.reduce((s: number, r: any) => s + (r.y[y] ?? 0), 0);

// The tech sheet only carries Y2/Y3 growth on the two SUBTOTAL rows (leaf rows
// are Y1-only). Distribute each subtotal's Y2/Y3 across its leaves proportional
// to their Y1 weight so every leaf is fully editable AND Σ leaves == totalLakh
// exactly (verified). Header rows ("1. SALARIES", "2. CLOUD INFRA...") are kept
// as non-editable group labels; subtotal rows are consumed, not emitted.
const isTechHeader = (it: string) => /^\s*\d+\.\s/.test(it);
const isSubtotal = (it: string) => /SUBTOTAL/i.test(it);
function buildTechLeaves(items: any[]): Row[] {
  const out: Row[] = [];
  let leaves: Row[] = [];
  for (const r of items) {
    if (isTechHeader(r.item)) {
      out.push({ item: r.item, y: [0, 0, 0], header: true });
      leaves = [];
    } else if (isSubtotal(r.item)) {
      const y1 = leaves.reduce((s, l) => s + l.y[0], 0) || 1;
      for (const l of leaves) {
        l.y[1] = r.y[1] * (l.y[0] / y1);
        l.y[2] = r.y[2] * (l.y[0] / y1);
      }
      leaves = [];
    } else {
      const leaf: Row = { item: r.item, y: [r.y[0], 0, 0] };
      out.push(leaf);
      leaves.push(leaf);
    }
  }
  return out;
}

export function makeDefaultState(): ModelState {
  return {
    casesPerMonth: [...DEFAULT_INPUTS.casesPerMonth],
    ticket: DEFAULT_INPUTS.ticket,
    annualRate: DEFAULT_INPUTS.annualRate,
    tenureMonths: DEFAULT_INPUTS.tenureMonths,
    processingFeePct: DEFAULT_INPUTS.processingFeePct,
    costOfCapitalPct: DEFAULT_INPUTS.costOfCapitalPct,
    cacPct: DEFAULT_INPUTS.cacPct,
    tech: buildTechLeaves(w.tech.items),
    operations: {
      roles: w.operations.roles.map((r: any) => ({ role: r.role, rate: r.rate, heads: [...r.heads] })),
      overheads: w.operations.overheads.map((r: any) => ({ item: r.item, y: [...r.y] })),
      salariesBooked: [0, 1, 2].map((y) => w.operations.grandTotal[y] - overheadsSum(y)),
    },
    marketing: w.marketing.items.map((r: any) => ({ item: r.item, y: [...r.y] })),
    setup: w.setup.items.map((r: any) => ({ item: r.item, y: [...r.y] })),
    cities: w.cities.map((c: any) => ({ city: c.city, loans: [...c.loans] })),
    provisioning: w.provisioning.mix.map((m: any) => ({ type: m.type, rate: m.rate, share: [...m.share] })),
  };
}

export const DEFAULT_STATE: ModelState = makeDefaultState();

// ---- derived section totals ----
// tech rows are stored in ₹ lakhs; sum the leaf rows (skip group-header rows).
export function techTotals(rows: Row[]): number[] {
  return [0, 1, 2].map((y) => rows.filter((r) => !r.header).reduce((s, r) => s + (r.y[y] ?? 0), 0) * 1e5);
}
export function opsTotals(op: OperationsState): number[] {
  return [0, 1, 2].map(
    (y) => op.overheads.reduce((s, r) => s + (r.y[y] ?? 0), 0) + (op.salariesBooked[y] ?? 0),
  );
}
export function rolesRunRate(roles: Role[]): number[] {
  return [0, 1, 2].map((y) => roles.reduce((s, r) => s + r.rate * (r.heads[y] ?? 0), 0));
}
export function sumRows(rows: Row[]): number[] {
  return [0, 1, 2].map((y) => rows.reduce((s, r) => s + (r.y[y] ?? 0), 0));
}
export function blendedRate(mix: MixRow[]): number[] {
  return [0, 1, 2].map((y) => mix.reduce((s, m) => s + m.rate * (m.share[y] ?? 0), 0));
}

export function deriveInputs(s: ModelState): ModelInputs {
  return {
    casesPerMonth: s.casesPerMonth,
    ticket: s.ticket,
    annualRate: s.annualRate,
    tenureMonths: s.tenureMonths,
    processingFeePct: s.processingFeePct,
    costOfCapitalPct: s.costOfCapitalPct,
    cacPct: s.cacPct,
    techCost: techTotals(s.tech),
    operationsCost: opsTotals(s.operations),
    marketingCost: sumRows(s.marketing),
    setupCost: sumRows(s.setup),
    provisionBlendedRate: blendedRate(s.provisioning),
  };
}

export { clone };
