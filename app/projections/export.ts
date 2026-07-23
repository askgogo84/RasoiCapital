// app/projections/export.ts — export the CURRENT edited model state to .xlsx
// (SheetJS), one sheet per section, mirroring the V3 workbook's tab names.
import * as XLSX from "xlsx";
import type { computeModel, YearPL } from "@/lib/model/engine";
import type { ModelState } from "./state";
import { techTotals, opsTotals, sumRows, groupTotals, deriveInputs, deriveCapital, deriveUnitEconomics } from "./state";

const cr = (v: number) => +(v / 1e7).toFixed(2); // ₹ → ₹ Cr (2dp)

const PL_LINES: [string, (y: YearPL) => number][] = [
  ["Disbursed", (y) => y.disbursedValue],
  ["Interest Income", (y) => y.interestIncome],
  ["Processing Fee", (y) => y.processingFee],
  ["Total Income", (y) => y.totalIncome],
  ["Cost of Capital", (y) => y.costOfCapital],
  ["Direct Cost", (y) => y.directCost],
  ["Contribution", (y) => y.contribution],
  ["Tech", (y) => y.techCost],
  ["Operations", (y) => y.operationsCost],
  ["Marketing", (y) => y.marketingCost],
  ["Provision", (y) => y.provision],
  ["Expense", (y) => y.expense],
  ["EBITDA", (y) => y.ebitda],
  ["EBITDA %", (y) => +(y.ebitdaPct * 100).toFixed(2)],
  ["AUM (year-end book)", (y) => y.aum],
  ["Set-Up Cost", (y) => y.setupCost],
];

export function exportModel(state: ModelState, outputs: ReturnType<typeof computeModel>) {
  const wb = XLSX.utils.book_new();
  const add = (name: string, aoa: (string | number)[][]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name.slice(0, 31));
  const years = outputs.years;
  const emi = outputs.emiByYear;

  // ---- Summary ----
  add("Summary", [
    ["Rasoi Capital — Financial Model V3 (current session edits)"],
    [],
    ["Metric", "Year 1", "Year 2", "Year 3"],
    ["Disbursed (₹)", ...years.map((y) => y.disbursedValue)],
    ["Loans", ...years.map((y) => y.disbursedCount)],
    ["AUM / total book (₹)", ...years.map((y) => y.aum)],
    ["EBITDA (₹)", ...years.map((y) => y.ebitda)],
    ["EBITDA %", ...years.map((y) => +(y.ebitdaPct * 100).toFixed(2))],
    [],
    ["EMI by ticket year (₹)", ...emi],
  ]);

  // ---- Capital Allocation (same deriveCapital() the Dashboard panel uses) ----
  const cap = deriveCapital(deriveInputs(state), outputs, state.allocation);
  add("Capital Allocation", [
    ["Rasoi Capital — Capital Allocation & Year-1 runway"],
    [],
    ["Metric", "Value (₹)", "Value (₹ Cr)"],
    ["Total Raise", cap.raise, cr(cap.raise)],
    ["Lending Deposit (equity base)", cap.lendingDeposit, cr(cap.lendingDeposit)],
    ["Leverage Multiple (×)", cap.leverageMultiple, cap.leverageMultiple],
    ["Lending Capacity (deposit × multiple)", cap.lendingCapacity, cr(cap.lendingCapacity)],
    ["Cash Reserve (raise − deposit)", cap.cashReserve, cr(cap.cashReserve)],
    ["Total Y1 Expense (accrual, incl provision + set-up)", cap.totalExpenseY1, cr(cap.totalExpenseY1)],
    ["Cash Left after Y1 (reserve − net cash burn)", cap.cashLeftAfterY1, cr(cap.cashLeftAfterY1)],
    [],
    ["Year-1 cash-flow detail", "Value (₹)", "Value (₹ Cr)"],
    ["Y1 Cash Expense (excl non-cash provision)", cap.cashExpenseY1, cr(cap.cashExpenseY1)],
    ["Y1 Income (interest + processing fee)", cap.incomeY1, cr(cap.incomeY1)],
    ["Y1 Net Cash Burn (cash expense − income)", cap.netCashBurnY1, cr(cap.netCashBurnY1)],
    ["Y1 Provision (non-cash accrual)", cap.provisionY1, cr(cap.provisionY1)],
    ["Y1 Disbursed (capacity check)", cap.disbursedY1, cr(cap.disbursedY1)],
    ["Capacity covers Y1 disbursal?", cap.capacityShort ? "NO — increase deposit" : "yes", ""],
  ]);

  // ---- Loan Engine ----
  const le: (string | number)[][] = [
    ["Driver", "Year 1", "Year 2", "Year 3"],
    ["Avg ticket (₹)", ...state.ticketByYear],
    ["Cost of capital (p.a.)", ...state.costOfCapitalByYear],
    ["EMI (₹)", ...emi],
    [],
    ["Driver", "Value"],
    ["Interest rate (p.a.)", state.annualRate],
    ["Tenure (months)", state.tenureMonths],
    ["Processing fee", state.processingFeePct],
    [],
    ["Month", "Year", "Cases", "Ticket", "Disbursed", "Interest Income", "Principal Collected", "EMI Collection", "Interest Book", "Principal Book", "Total Book", "Cost of Capital", "Processing Fee"],
  ];
  outputs.monthly.forEach((r) =>
    le.push([r.month, r.year, r.cases, r.ticket, r.disbursed, r.interestIncome, r.principalCollected, r.emiCollection, r.interestBook, r.principalBook, r.totalBook, r.costOfCapital, r.processingFee]),
  );
  add("Loan Engine", le);

  // ---- City Break Up ----
  const cty: (string | number)[][] = [["City", "Year 1", "Year 2", "Year 3"]];
  state.cities.forEach((c) => cty.push([c.city, ...c.loans]));
  cty.push(["City total", ...[0, 1, 2].map((y) => state.cities.reduce((s, c) => s + (c.loans[y] ?? 0), 0))]);
  cty.push(["Σ cases / year", ...[0, 1, 2].map((y) => state.casesPerMonth.slice(y * 12, y * 12 + 12).reduce((a, b) => a + b, 0))]);
  add("City Break Up", cty);

  // ---- P&L ----
  const pl: (string | number)[][] = [["Line (₹)", "Year 1", "Year 2", "Year 3"]];
  PL_LINES.forEach(([label, fn]) => pl.push([label, ...years.map((y) => Math.round(fn(y) * 100) / 100)]));
  add("P&L", pl);

  // ---- Tech Cost (₹ lakh) ----
  const tech: (string | number)[][] = [["Item (₹ lakh)", "Year 1", "Year 2", "Year 3"]];
  state.tech.forEach((r) => (r.header ? tech.push([r.item]) : tech.push([r.item, ...r.y.map((v) => +v.toFixed(4))])));
  tech.push(["Total (₹)", ...techTotals(state.tech)]);
  add("Tech Cost", tech);

  // ---- Operations (roles / variable / offices breakdown + driver total) ----
  const ops: (string | number)[][] = [["ROLES (₹)", "Rate (₹/yr)", "Year 1", "Year 2", "Year 3"]];
  state.operations.roles.forEach((r) => ops.push([r.item, r.rate ?? "", ...r.y]));
  ops.push(["Roles subtotal", "", ...groupTotals(state.operations.roles)]);
  ops.push([]);
  ops.push(["VARIABLE (₹)", "Rate", "Year 1", "Year 2", "Year 3"]);
  state.operations.variable.forEach((r) => ops.push([r.item, r.rateLabel ?? "", ...r.y]));
  ops.push(["Variable subtotal", "", ...groupTotals(state.operations.variable)]);
  ops.push([]);
  ops.push(["OFFICES (₹)", "", "Year 1", "Year 2", "Year 3"]);
  state.operations.offices.forEach((r) => ops.push([r.item, "", ...r.y]));
  ops.push(["Offices subtotal", "", ...groupTotals(state.operations.offices)]);
  ops.push([]);
  ops.push(["Operations Total — model driver (₹)", "", ...opsTotals(state.operations)]);
  add("Operations", ops);

  // ---- Marketing ----
  const mkt: (string | number)[][] = [["Item (₹)", "Year 1", "Year 2", "Year 3"]];
  state.marketing.forEach((r) => mkt.push([r.item, ...r.y]));
  mkt.push(["Total (₹)", ...sumRows(state.marketing)]);
  add("Marketing", mkt);

  // ---- Set-Up Cost ----
  const setup: (string | number)[][] = [["Item (₹)", "Year 1", "Year 2", "Year 3"]];
  state.setup.forEach((r) => setup.push([r.item, ...r.y]));
  setup.push(["Total (₹)", ...sumRows(state.setup)]);
  add("Set-Up Cost", setup);

  // ---- Provisioning ----
  const prov: (string | number)[][] = [["Line", "Year 1", "Year 2", "Year 3"]];
  prov.push(["Blended rate", ...state.provisioning]);
  prov.push(["AUM (year-end book) (₹)", ...years.map((y) => y.aum)]);
  prov.push(["Provision (₹)", ...years.map((y) => y.provision)]);
  add("Provisioning", prov);

  // ---- Unit Economics (per-loan margin, live by disbursal year) ----
  const uec = deriveUnitEconomics(deriveInputs(state), state.unitEconAssumptions);
  const p2 = (v: number) => +(v * 100).toFixed(2);
  const ur = (label: string, sel: (c: typeof uec.y1) => number, note = "") =>
    [label, p2(sel(uec.y1)), p2(sel(uec.y2)), p2(sel(uec.y3)), note] as (string | number)[];
  add("Unit Economics", [
    ["Unit Economics — per loan (% of disbursed), by disbursal year"],
    [],
    ["Component", "Year 1 %", "Year 2 %", "Year 3 %", "Source"],
    ["INCOME", "", "", "", ""],
    ur("Interest", (c) => c.interest, "live · Loan Engine annualRate"),
    ur("Processing Fee", (c) => c.pf, "live · Loan Engine processingFeePct"),
    ur("Total Income", (c) => c.totalIncome),
    ["DIRECT COST", "", "", "", ""],
    ur("Cost of Capital", (c) => c.coc, "live · Loan Engine costOfCapitalByYear"),
    ur("Tech", (c) => c.tech, "editable assumption (view only)"),
    ur("Collection", (c) => c.collection, "editable assumption (view only)"),
    ur("Opex", (c) => c.opex, "editable assumption (view only)"),
    ur("Bad Debts", (c) => c.badDebts, "editable assumption (view only)"),
    ur("Total Direct Cost", (c) => c.totalDirectCost),
    ur("Contribution Margin", (c) => c.contributionMargin),
  ]);

  XLSX.writeFile(wb, "Rasoi_Financial_Model_V3.xlsx");
}
