// lib/model/defaults.ts — every value extracted programmatically from
// Loan_Projection_V2.xlsx (nothing hand-transcribed). These are the editable
// starting points for the UI; edits flow into computeModel() in real time.
import type { ModelInputs } from "./engine";
import raw from "./model_defaults.json";

export const DEFAULT_CASES_PER_MONTH: number[] = [
  100,100,100,200,200,300,300,300,300,300,400,400,
  500,600,700,800,900,1000,1100,1200,1350,1500,1600,1750,
  1900,2050,2200,2300,2400,2500,2600,2700,2750,2800,2850,2950,
];

export const WORKBOOK = raw; // cities, tech, operations, marketing, setup, provisioning tables

export const DEFAULT_INPUTS: ModelInputs = {
  casesPerMonth: DEFAULT_CASES_PER_MONTH,
  ticket: 500_000,
  annualRate: 0.19,
  tenureMonths: 24,
  processingFeePct: 0.025,
  costOfCapitalPct: 0.10,
  cacPct: 0.01,
  techCost: raw.tech.totalLakh.map((l: number) => l * 100_000),  // sheet stores lakhs
  operationsCost: raw.operations.grandTotal,
  marketingCost: raw.marketing.total,
  setupCost: raw.setup.total,
  provisionBlendedRate: raw.provisioning.blended,
};
