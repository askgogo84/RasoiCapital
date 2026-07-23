// lib/model/engine.ts
// Deterministic port of Loan_Projection_V3.xlsx — verified golden-master
// against the workbook's cached values (see engine.test.ts).
//
// V3 changes vs V2:
//  - Multi-ticket by disbursal YEAR: Y1 = ₹5L, Y2 = ₹7L, Y3 = ₹10L
//  - Cost of capital STEPS DOWN by year: 10% / 9.5% / 9%  (was flat 10%)
//  - No separate CAC line (folded into opex/collection)
//  - AUM reported = TOTAL book (interest receivable + principal), row 25+26
//
// Verified semantics:
//  - Vintage v disburses in month v at that year's ticket; first EMI month v+1
//  - EMI            = round(PMT(rate/12, tenure, -ticket))
//  - Interest part  = round(reducing-balance interest), principal = EMI - interest
//  - Payments truncate at calendar month 36 (P&L year-sums cover M1..M36 only)
//  - Cost of capital = end-of-month PRINCIPAL book × (yearRate/12)
//  - Provision       = year-end TOTAL book × blended RBI rate
//  - Processing fee  = pf × disbursed

export interface ModelInputs {
  casesPerMonth: number[];          // length 36
  ticketByYear: [number, number, number]; // [Y1,Y2,Y3] avg loan
  annualRate: number;               // 0.19
  tenureMonths: number;             // 24
  processingFeePct: number;         // 0.025
  costOfCapitalByYear: [number, number, number]; // [0.10, 0.095, 0.09]
  techCost: number[];               // [Y1,Y2,Y3] ₹
  operationsCost: number[];
  marketingCost: number[];
  setupCost: number[];
  provisionBlendedRate: number[];   // [Y1,Y2,Y3]
}

export interface MonthlyRow {
  month: number; year: number; cases: number; ticket: number; disbursed: number;
  interestIncome: number; principalCollected: number; emiCollection: number;
  interestBook: number; principalBook: number; totalBook: number;
  costOfCapital: number; processingFee: number;
}

export interface YearPL {
  disbursedValue: number; disbursedCount: number;
  interestIncome: number; processingFee: number; totalIncome: number;
  costOfCapital: number; directCost: number; contribution: number;
  techCost: number; operationsCost: number; marketingCost: number; provision: number;
  expense: number; ebitda: number; ebitdaPct: number; setupCost: number;
  aum: number; // year-end total book
}

export interface ModelOutputs { monthly: MonthlyRow[]; years: [YearPL, YearPL, YearPL]; emiByYear: [number, number, number]; }

const PMT = (r: number, n: number, pv: number) => (r * pv) / (1 - Math.pow(1 + r, -n));

interface Sched { emi: number; interest: number[]; principal: number[]; }
function schedule(annualRate: number, n: number, L: number): Sched {
  const r = annualRate / 12;
  const emi = Math.round(PMT(r, n, L));
  const interest: number[] = [], principal: number[] = [];
  let bal = L;
  for (let k = 0; k < n; k++) {
    const i = Math.round(bal * r);
    interest.push(i); principal.push(emi - i); bal -= emi - i;
  }
  return { emi, interest, principal };
}

const yearOf = (month1: number) => Math.min(2, Math.ceil(month1 / 12) - 1); // 0,1,2

export function computeModel(inp: ModelInputs): ModelOutputs {
  const M = 36, n = inp.tenureMonths;
  const scheds = inp.ticketByYear.map((L) => schedule(inp.annualRate, n, L)) as [Sched, Sched, Sched];
  const emiByYear = scheds.map((s) => s.emi) as [number, number, number];

  const ii = new Array(M).fill(0), pc = new Array(M).fill(0);
  for (let v = 1; v <= M; v++) {
    const yr = yearOf(v), s = scheds[yr], c = inp.casesPerMonth[v - 1] ?? 0;
    for (let k = 1; k <= n; k++) {
      const m = v + k; if (m > M) break;      // truncate at calendar M36
      ii[m - 1] += s.interest[k - 1] * c;
      pc[m - 1] += s.principal[k - 1] * c;
    }
  }

  const monthly: MonthlyRow[] = [];
  for (let m = 1; m <= M; m++) {
    const yr = yearOf(m);
    const cases = inp.casesPerMonth[m - 1] ?? 0;
    const ticket = inp.ticketByYear[yr];
    // books at end of month m: remaining interest / principal across live vintages
    let ib = 0, pb = 0;
    for (let v = 1; v <= m; v++) {
      const vy = yearOf(v), s = scheds[vy], c = inp.casesPerMonth[v - 1] ?? 0;
      // payments already landed by end of month m are those with v+k <= m, i.e. k <= m-v
      const paid = Math.max(0, Math.min(n, m - v));       // count of EMIs paid
      for (let k = paid; k < n; k++) {                    // remaining scheduled EMIs
        ib += s.interest[k] * c; pb += s.principal[k] * c;
      }
    }
    monthly.push({
      month: m, year: yr + 1, cases, ticket, disbursed: cases * ticket,
      interestIncome: ii[m - 1], principalCollected: pc[m - 1],
      emiCollection: ii[m - 1] + pc[m - 1],
      interestBook: ib, principalBook: pb, totalBook: ib + pb,
      costOfCapital: pb * (inp.costOfCapitalByYear[yr] / 12),
      processingFee: cases * ticket * inp.processingFeePct,
    });
  }

  const Y = (f: (r: MonthlyRow) => number, y: number) =>
    monthly.slice((y - 1) * 12, y * 12).reduce((s, r) => s + f(r), 0);

  const years = [1, 2, 3].map((y) => {
    const disbursedValue = Y((r) => r.disbursed, y);
    const interestIncome = Y((r) => r.interestIncome, y);
    const processingFee = Y((r) => r.processingFee, y);
    const totalIncome = interestIncome + processingFee;
    const costOfCapital = Y((r) => r.costOfCapital, y);
    const directCost = costOfCapital;
    const contribution = totalIncome - directCost;
    const aum = monthly[y * 12 - 1].totalBook;
    const provision = aum * (inp.provisionBlendedRate[y - 1] ?? 0);
    const techCost = inp.techCost[y - 1] ?? 0;
    const operationsCost = inp.operationsCost[y - 1] ?? 0;
    const marketingCost = inp.marketingCost[y - 1] ?? 0;
    const setupCost = inp.setupCost[y - 1] ?? 0;
    const expense = techCost + operationsCost + marketingCost + provision;
    const ebitda = contribution - expense;
    return {
      disbursedValue, disbursedCount: Y((r) => r.cases, y),
      interestIncome, processingFee, totalIncome,
      costOfCapital, directCost, contribution,
      techCost, operationsCost, marketingCost, provision,
      expense, ebitda, ebitdaPct: ebitda / totalIncome, setupCost, aum,
    } as YearPL;
  }) as [YearPL, YearPL, YearPL];

  return { monthly, years, emiByYear };
}
