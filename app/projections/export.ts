// app/projections/export.ts — export the CURRENT edited model state to .xlsx
// (SheetJS), one sheet per section, mirroring the workbook's tab names.
import * as XLSX from "xlsx";
import type { computeModel, YearPL } from "@/lib/model/engine";
import type { ModelState } from "./state";
import { techTotals, opsTotals, sumRows, rolesRunRate, blendedRate } from "./state";

const PL_LINES: [string, (y: YearPL) => number][] = [
  ["Disbursed", (y) => y.disbursedValue],
  ["Interest Income", (y) => y.interestIncome],
  ["Processing Fee", (y) => y.processingFee],
  ["Total Income", (y) => y.totalIncome],
  ["Cost of Capital", (y) => y.costOfCapital],
  ["CAC", (y) => y.cac],
  ["Direct Cost", (y) => y.directCost],
  ["Contribution", (y) => y.contribution],
  ["Tech", (y) => y.techCost],
  ["Operations", (y) => y.operationsCost],
  ["Marketing", (y) => y.marketingCost],
  ["Provision", (y) => y.provision],
  ["Expense", (y) => y.expense],
  ["EBITDA", (y) => y.ebitda],
  ["Set-Up Cost", (y) => y.setupCost],
  ["EBITDA after Set-Up", (y) => y.ebitdaAfterSetup],
];

export function exportModel(state: ModelState, outputs: ReturnType<typeof computeModel>) {
  const wb = XLSX.utils.book_new();
  const add = (name: string, aoa: (string | number)[][]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name.slice(0, 31));
  const years = outputs.years;

  // ---- Summary ----
  add("Summary", [
    ["Rasoi Capital — Financial Model (current session edits)"],
    [],
    ["Metric", "Year 1", "Year 2", "Year 3"],
    ["Disbursed (₹)", ...years.map((y) => y.disbursedValue)],
    ["Loans", ...years.map((y) => y.disbursedCount)],
    ["Year-end book (₹)", ...years.map((y) => y.yearEndBook)],
    ["EBITDA (₹)", ...years.map((y) => y.ebitda)],
    [],
    ["EMI (₹)", outputs.emi],
  ]);

  // ---- Loan Engine ----
  const le: (string | number)[][] = [
    ["Driver", "Value"],
    ["Avg ticket (₹)", state.ticket],
    ["Interest rate (p.a.)", state.annualRate],
    ["Tenure (months)", state.tenureMonths],
    ["Processing fee", state.processingFeePct],
    ["Cost of capital (p.a.)", state.costOfCapitalPct],
    ["CAC", state.cacPct],
    ["EMI (₹)", outputs.emi],
    [],
    ["Month", "Cases", "Disbursed", "Interest Income", "Principal Collected", "EMI Collection", "Receivables Book", "Principal Outstanding", "Cost of Capital", "Processing Fee", "Funds Required"],
  ];
  outputs.monthly.forEach((r) =>
    le.push([r.month, r.cases, r.disbursed, r.interestIncome, r.principalCollected, r.emiCollection, r.receivablesBook, r.principalOutstanding, r.costOfCapital, r.processingFee, r.fundsRequired]),
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
  PL_LINES.forEach(([label, fn]) => pl.push([label, ...years.map((y) => Math.round(fn(y)))]));
  add("P&L", pl);

  // ---- Tech Cost (₹ lakh) ----
  const tech: (string | number)[][] = [["Item (₹ lakh)", "Year 1", "Year 2", "Year 3"]];
  state.tech.forEach((r) => (r.header ? tech.push([r.item]) : tech.push([r.item, ...r.y.map((v) => +v.toFixed(4))])));
  tech.push(["Total (₹)", ...techTotals(state.tech)]);
  add("Tech Cost", tech);

  // ---- Operations ----
  const ops: (string | number)[][] = [
    ["Role", "Rate (₹/yr)", "Heads Y1", "Heads Y2", "Heads Y3", "Run-rate Y1 (₹)", "Run-rate Y2 (₹)", "Run-rate Y3 (₹)"],
  ];
  state.operations.roles.forEach((r) =>
    ops.push([r.role, r.rate, ...r.heads, r.rate * r.heads[0], r.rate * r.heads[1], r.rate * r.heads[2]]),
  );
  ops.push([]);
  ops.push(["Item (₹)", "Year 1", "Year 2", "Year 3"]);
  ops.push(["Salaries (booked)", ...state.operations.salariesBooked]);
  state.operations.overheads.forEach((r) => ops.push([r.item, ...r.y]));
  ops.push(["Operations Total (₹)", ...opsTotals(state.operations)]);
  ops.push(["Run-rate total (₹)", ...rolesRunRate(state.operations.roles)]);
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
  const prov: (string | number)[][] = [["Asset Class", "Rate", "Share Y1", "Share Y2", "Share Y3"]];
  state.provisioning.forEach((m) => prov.push([m.type, m.rate, ...m.share]));
  prov.push([]);
  prov.push(["Blended rate", "", ...blendedRate(state.provisioning)]);
  prov.push(["Provision (₹)", "", ...years.map((y) => y.provision)]);
  add("Provisioning", prov);

  XLSX.writeFile(wb, "Rasoi_Financial_Model.xlsx");
}
