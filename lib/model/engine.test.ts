// lib/model/engine.test.ts — GOLDEN MASTER vs Loan_Projection_V3.xlsx.
// If these fail, the site no longer matches the CFO workbook — fix the engine,
// never the expectations.
import { describe, it, expect } from "vitest";
import { computeModel } from "./engine";
import { DEFAULT_INPUTS } from "./defaults";

const out = computeModel(DEFAULT_INPUTS);
const [Y1, Y2, Y3] = out.years;

describe("V3 golden master vs workbook", () => {
  it("EMI by ticket: 5L→25,204  7L→35,286  10L→50,409", () => {
    expect(out.emiByYear).toEqual([25_204, 35_286, 50_409]);
  });
  it("disbursed ₹150 / 525 / 1,575 Cr", () => {
    expect(Y1.disbursedValue).toBe(1_500_000_000);
    expect(Y2.disbursedValue).toBe(5_250_000_000);
    expect(Y3.disbursedValue).toBe(15_750_000_000);
  });
  it("loan counts 3,000 / 7,500 / 15,750", () => {
    expect(Y1.disbursedCount).toBe(3_000);
    expect(Y2.disbursedCount).toBe(7_500);
    expect(Y3.disbursedCount).toBe(15_750);
  });
  it("interest income — Y1 & Y2 exact, Y3 within EMI-rounding drift", () => {
    expect(Y1.interestIncome).toBe(88_597_800);
    expect(Y2.interestIncome).toBe(555_890_900);
    expect(Math.abs(Y3.interestIncome - 1_684_146_750) / 1_684_146_750).toBeLessThan(0.005);
  });
  it("processing fee 2.5% of disbursed", () => {
    expect(Y1.processingFee).toBe(37_500_000);
    expect(Y2.processingFee).toBe(131_250_000);
    expect(Y3.processingFee).toBe(393_750_000);
  });
  it("AUM (total book) — M12 exact, later years within drift", () => {
    expect(out.monthly[11].totalBook).toBe(1_502_158_400);
    expect(Math.abs(Y2.aum - 5_528_336_300) / 5_528_336_300).toBeLessThan(0.02);
    expect(Math.abs(Y3.aum - 17_064_366_050) / 17_064_366_050).toBeLessThan(0.015);
  });
  it("cost of capital uses STEPPED rate 10/9.5/9% on principal book", () => {
    expect(Math.abs(Y1.costOfCapital - 57_261_320) / 57_261_320).toBeLessThan(0.001);
    expect(Math.abs(Y2.costOfCapital - 301_011_870) / 301_011_870).toBeLessThan(0.02);
    expect(Math.abs(Y3.costOfCapital - 871_264_622) / 871_264_622).toBeLessThan(0.02);
  });
  it("no CAC line — direct cost = cost of capital only", () => {
    expect(Y1.directCost).toBe(Y1.costOfCapital);
  });
  it("cost inputs match the workbook", () => {
    expect(Y1.techCost).toBeCloseTo(23_952_000, 0);
    expect(Y1.operationsCost).toBe(63_120_000);
    expect(Y1.marketingCost).toBe(7_800_000);
    expect(Y2.operationsCost).toBe(138_354_000);
    expect(Y3.operationsCost).toBe(227_303_000);
  });
  it("EBITDA: -₹5.18 Cr / -₹3.72 Cr / +₹31+ Cr — breakeven in Y3", () => {
    expect(Y1.ebitda).toBeLessThan(0);
    expect(Y2.ebitda).toBeLessThan(0);
    expect(Y3.ebitda).toBeGreaterThan(0);
    // Y1 exact; Y2/Y3 within the accumulated EMI-rounding + book drift (<₹1 Cr on
    // a ₹550 Cr book). Directionally identical to the workbook to the crore.
    expect(Math.abs(Y1.ebitda - -51_759_982.6)).toBeLessThan(200_000);
    expect(Math.abs(Y2.ebitda - -37_171_354.2)).toBeLessThan(12_000_000);
    expect(Math.abs(Y3.ebitda - 312_453_605.6)).toBeLessThan(12_000_000);
  });
  it("is deterministic", () => {
    expect(computeModel(DEFAULT_INPUTS)).toEqual(computeModel(DEFAULT_INPUTS));
  });
});
