// app/projections/state.ts — the single editable ModelState for /projections,
// plus deriveInputs() which folds the editable cost tables into the ModelInputs
// consumed by lib/model/engine.ts (V3).
//
// deriveInputs(DEFAULT_STATE) reproduces DEFAULT_INPUTS (and therefore the V3
// golden-master numbers) exactly, via these reconciliation rules — each proven
// against v3_defaults.json:
//   tech        : Σ of the leaf rows × 1e5   (Y2/Y3 growth carried on the two
//                 SUBTOTAL rows is distributed across leaves; Σ leaves == totalLakh)
//   operations  : the workbook grandTotal per year (authoritative). The roles /
//                 variable / offices breakdown is a reference view — its Y1 sum
//                 over-states grandTotal by the Director draw, so the model is
//                 driven by grandTotal, not by re-summing the groups.
//   marketing   : Σ items
//   setup       : Σ items   (row-sum avoids the workbook's Y2 =SUM(H2:H6) bug)
//   provision   : blended[y] straight from the workbook (V3 has no editable mix)
import type { ModelInputs } from "@/lib/model/engine";
import { DEFAULT_INPUTS, WORKBOOK } from "@/lib/model/defaults";

export type Y3 = [number, number, number];
// y = [Y1,Y2,Y3]. `rate` (roles) and `rateLabel` (variable) are display-only.
export type Row = { item: string; y: number[]; header?: boolean; rate?: number; rateLabel?: string };
export type City = { city: string; loans: number[] };

export interface OperationsState {
  roles: Row[];        // {item: role, rate: ₹/head, y: cost} — reference breakdown
  variable: Row[];     // {item, rateLabel, y} — reference breakdown
  offices: Row[];      // {item, y} — reference breakdown
  grandTotal: number[]; // [Y1,Y2,Y3] — editable driver (workbook total)
}

export interface ModelState {
  // ---- Loan engine drivers ----
  casesPerMonth: number[]; // length 36
  ticketByYear: Y3;        // avg loan by disbursal year
  annualRate: number;
  tenureMonths: number;
  processingFeePct: number;
  costOfCapitalByYear: Y3; // stepped cost of capital by year
  // ---- Editable cost tables ----
  tech: Row[]; // lakhs; includes header/leaf/subtotal rows
  operations: OperationsState;
  marketing: Row[];
  setup: Row[];
  cities: City[];
  provisioning: Y3; // blended RBI rate per year
}

const w: any = WORKBOOK;

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
    ticketByYear: [...DEFAULT_INPUTS.ticketByYear] as Y3,
    annualRate: DEFAULT_INPUTS.annualRate,
    tenureMonths: DEFAULT_INPUTS.tenureMonths,
    processingFeePct: DEFAULT_INPUTS.processingFeePct,
    costOfCapitalByYear: [...DEFAULT_INPUTS.costOfCapitalByYear] as Y3,
    tech: buildTechLeaves(w.tech.items),
    operations: {
      roles: w.operations.roles.map((r: any) => ({ item: r.role, rate: r.rate, y: [...r.y] })),
      variable: w.operations.variable.map((r: any) => ({ item: r.item, rateLabel: r.rate ?? "", y: [...r.y] })),
      offices: w.operations.offices.map((r: any) => ({ item: r.item, y: [...r.y] })),
      grandTotal: [...w.operations.grandTotal],
    },
    marketing: w.marketing.items.map((r: any) => ({ item: r.item, y: [...r.y] })),
    setup: w.setup.items.map((r: any) => ({ item: r.item, y: [...r.y] })),
    cities: w.cities.map((c: any) => ({ city: c.city, loans: [...c.loans] })),
    provisioning: [...w.provisioning.blended] as Y3,
  };
}

export const DEFAULT_STATE: ModelState = makeDefaultState();

// ---- derived section totals ----
// tech rows are stored in ₹ lakhs; sum the leaf rows (skip group-header rows).
export function techTotals(rows: Row[]): number[] {
  return [0, 1, 2].map((y) => rows.filter((r) => !r.header).reduce((s, r) => s + (r.y[y] ?? 0), 0) * 1e5);
}
// operations model driver = the workbook grand total (see header note).
export function opsTotals(op: OperationsState): number[] {
  return [0, 1, 2].map((y) => op.grandTotal[y] ?? 0);
}
// Σ of a single reference group (roles / variable / offices) per year.
export function groupTotals(rows: Row[]): number[] {
  return [0, 1, 2].map((y) => rows.reduce((s, r) => s + (r.y[y] ?? 0), 0));
}
export function sumRows(rows: Row[]): number[] {
  return [0, 1, 2].map((y) => rows.reduce((s, r) => s + (r.y[y] ?? 0), 0));
}

export function deriveInputs(s: ModelState): ModelInputs {
  return {
    casesPerMonth: s.casesPerMonth,
    ticketByYear: s.ticketByYear,
    annualRate: s.annualRate,
    tenureMonths: s.tenureMonths,
    processingFeePct: s.processingFeePct,
    costOfCapitalByYear: s.costOfCapitalByYear,
    techCost: techTotals(s.tech),
    operationsCost: opsTotals(s.operations),
    marketingCost: sumRows(s.marketing),
    setupCost: sumRows(s.setup),
    provisionBlendedRate: s.provisioning,
  };
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
export { clone };
