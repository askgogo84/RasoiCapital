// lib/model/engine.test.ts — GOLDEN MASTER against Loan_Projection_V2.xlsx
// cached values. If any of these fail, the site's model no longer matches the
// CFO workbook — do not "fix" the expectations; fix the engine.
import { describe, it, expect } from "vitest";
import { computeModel } from "./engine";
import { DEFAULT_INPUTS } from "./defaults";

const out = computeModel(DEFAULT_INPUTS);
const [Y1, Y2, Y3] = out.years;

describe("golden master vs workbook", () => {
  it("EMI = round(PMT(19%/12, 24, -5,00,000)) = 25,204", () => {
    expect(out.emi).toBe(25_204);
  });
  it("disbursed ₹150 / 650 / 1,500 Cr", () => {
    expect(Y1.disbursedValue).toBe(1_500_000_000);
    expect(Y2.disbursedValue).toBe(6_500_000_000);
    expect(Y3.disbursedValue).toBe(15_000_000_000);
  });
  it("loan counts 3,000 / 13,000 / 30,000", () => {
    expect(Y1.disbursedCount).toBe(3_000);
    expect(Y2.disbursedCount).toBe(13_000);
    expect(Y3.disbursedCount).toBe(30_000);
  });
  it("interest income — exact to the rupee", () => {
    expect(Y1.interestIncome).toBe(88_597_800);
    expect(Y2.interestIncome).toBe(575_191_150);
    expect(Y3.interestIncome).toBe(1_889_912_600);
  });
  it("processing fee 2.5% of disbursed", () => {
    expect(Y1.processingFee).toBe(37_500_000);
    expect(Y2.processingFee).toBe(162_500_000);
    expect(Y3.processingFee).toBe(375_000_000);
  });
  it("receivables book at M12/M24/M36 — exact", () => {
    expect(out.monthly[11].receivablesBook).toBe(1_502_158_400);
    expect(out.monthly[23].receivablesBook).toBe(7_060_900_600);
    expect(out.monthly[35].receivablesBook).toBe(16_852_654_600);
  });
  it("bad-debt provision = year-end book x blended RBI rate", () => {
    expect(Y1.provision).toBeCloseTo(25_724_462.6, 0);
    expect(Y2.provision).toBeCloseTo(297_793_482.8, 0);
    expect(Y3.provision).toBeCloseTo(577_414_078.2, 0);
  });
  it("cost of capital within 0.05% of workbook (EMI rounding only)", () => {
    expect(Math.abs(Y1.costOfCapital - 57_261_320) / 57_261_320).toBeLessThan(0.0005);
    expect(Math.abs(Y2.costOfCapital - 342_474_834.6) / 342_474_834.6).toBeLessThan(0.0005);
    expect(Math.abs(Y3.costOfCapital - 1_065_783_264.6) / 1_065_783_264.6).toBeLessThan(0.0005);
  });
  it("cost inputs equal the P&L cross-references", () => {
    expect(Y1.techCost).toBeCloseTo(23_952_000, 0);
    expect(Y1.operationsCost).toBe(34_860_000);
    expect(Y1.marketingCost).toBe(7_800_000);
  });
  it("EBITDA: -₹3.85 Cr / -₹13.13 Cr / +₹16.28 Cr — breakeven in Y3", () => {
    // Tolerance ±₹50,000 (≈0.003% of Y3 EBITDA): the workbook rounds interest per EMI, which
    // drifts CoC by a few thousand rupees per year. Everything upstream of CoC
    // is exact to the rupee (see tests above).
    expect(Math.abs(Y1.ebitda - -38_499_982.6)).toBeLessThan(50_000);
    expect(Math.abs(Y2.ebitda - -131_255_967.4)).toBeLessThan(50_000);
    expect(Math.abs(Y3.ebitda - 162_796_577.2)).toBeLessThan(50_000);
    expect(Y1.ebitda).toBeLessThan(0);
    expect(Y2.ebitda).toBeLessThan(0);
    expect(Y3.ebitda).toBeGreaterThan(0); // the breakeven-in-Y3 story
  });
  it("is deterministic", () => {
    expect(computeModel(DEFAULT_INPUTS)).toEqual(computeModel(DEFAULT_INPUTS));
  });
});
