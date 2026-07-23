// lib/model/defaults.ts — every value extracted programmatically from
// Loan_Projection_V3.xlsx. Editable starting points for the UI.
import type { ModelInputs } from "./engine";
import raw from "./v3_defaults.json";

export const DEFAULT_CASES_PER_MONTH: number[] = [
  100,100,100,200,200,300,300,300,300,300,400,400,
  500,500,500,600,600,600,700,700,700,700,700,700,
  800,900,1000,1100,1200,1300,1400,1500,1550,1600,1700,1700,
];

export const WORKBOOK = raw;

export const DEFAULT_INPUTS: ModelInputs = {
  casesPerMonth: DEFAULT_CASES_PER_MONTH,
  ticketByYear: [500_000, 700_000, 1_000_000],
  annualRate: 0.19,
  tenureMonths: 24,
  processingFeePct: 0.025,
  costOfCapitalByYear: [0.10, 0.095, 0.09],
  techCost: raw.tech.totalLakh.map((l: number) => l * 100_000),
  operationsCost: raw.operations.grandTotal,
  marketingCost: raw.marketing.total,
  setupCost: raw.setup.items.reduce(
    (acc: number[], it: any) => [acc[0] + (it.y[0] || 0), acc[1] + (it.y[1] || 0), acc[2] + (it.y[2] || 0)],
    [0, 0, 0]
  ), // row-sum avoids the sheet's Y2 =SUM(H2:H6) bug
  provisionBlendedRate: raw.provisioning.blended,
};
