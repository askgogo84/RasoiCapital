// lib/model/engine.ts
// Deterministic port of Loan_Projection_V2.xlsx — verified golden-master
// against the workbook's cached values (see engine.test.ts).
//
// Semantics proven against the sheet:
//  - EMI            = round(PMT(rate/12, tenure, -ticket))
//  - Vintage v's payment k lands in calendar month v+k (first EMI the month
//    after disbursal); its interest part = round(IPMT(rate/12, k, tenure, -ticket))
//  - "Book" (rows 17-19) = remaining EMI receivables x EMI (principal+interest,
//    undiscounted) — NOT outstanding principal
//  - Cost of capital  = END-of-month outstanding PRINCIPAL x (coc/12)
//  - Bad-debt provision = year-end receivables book x blended RBI rate
//  - Processing fee   = pf x disbursed
//  - CAC              = cacPct x disbursed

export interface ModelInputs {
  casesPerMonth: number[];      // length 36
  ticket: number;               // avg loan amount (₹)
  annualRate: number;           // e.g. 0.19
  tenureMonths: number;         // e.g. 24
  processingFeePct: number;     // e.g. 0.025
  costOfCapitalPct: number;     // e.g. 0.10
  cacPct: number;               // e.g. 0.01
  // Year-indexed [Y1,Y2,Y3] cost totals (₹) — each is the sum of its editable table
  techCost: number[];
  operationsCost: number[];
  marketingCost: number[];
  setupCost: number[];
  provisionBlendedRate: number[]; // [Y1,Y2,Y3] e.g. [0.017125, 0.042175, 0.0342625]
}

export interface MonthlyRow {
  month: number; cases: number; disbursed: number;
  interestIncome: number; principalCollected: number; emiCollection: number;
  receivablesBook: number; principalOutstanding: number; costOfCapital: number;
  processingFee: number; fundsRequired: number;
}

export interface YearPL {
  disbursedValue: number; disbursedCount: number;
  interestIncome: number; processingFee: number; totalIncome: number;
  costOfCapital: number; cac: number; directCost: number; contribution: number;
  techCost: number; operationsCost: number; marketingCost: number; provision: number;
  expense: number; ebitda: number; setupCost: number; ebitdaAfterSetup: number;
  yearEndBook: number;
}

export interface ModelOutputs { monthly: MonthlyRow[]; years: [YearPL, YearPL, YearPL]; emi: number; }

const PMT = (r: number, n: number, pv: number) => (r * pv) / (1 - Math.pow(1 + r, -n));
const IPMT = (r: number, per: number, n: number, pv: number) => {
  const pmt = PMT(r, n, pv);
  const bal = pv * Math.pow(1 + r, per - 1) - pmt * ((Math.pow(1 + r, per - 1) - 1) / r);
  return bal * r;
};

export function computeModel(inp: ModelInputs): ModelOutputs {
  const M = 36, n = inp.tenureMonths, r = inp.annualRate / 12;
  const emi = Math.round(PMT(r, n, inp.ticket));
  // pre-compute one loan's schedule
  const iSched: number[] = [], pSched: number[] = [];
  for (let k = 1; k <= n; k++) {
    const i = Math.round(IPMT(r, k, n, inp.ticket));
    iSched.push(i); pSched.push(emi - i);
  }
  const horizon = M + n + 1;
  const ii = new Array(horizon).fill(0), pc = new Array(horizon).fill(0);
  for (let v = 1; v <= M; v++) {
    const c = inp.casesPerMonth[v - 1] ?? 0;
    for (let k = 1; k <= n; k++) {
      const m = v + k; if (m > horizon) break;
      ii[m - 1] += iSched[k - 1] * c;
      pc[m - 1] += pSched[k - 1] * c;
    }
  }
  const monthly: MonthlyRow[] = [];
  let cumD = 0, cumP = 0;
  for (let m = 1; m <= M; m++) {
    const cases = inp.casesPerMonth[m - 1] ?? 0;
    const disbursed = cases * inp.ticket;
    // receivables book at end of month m
    let book = 0;
    for (let v = 1; v <= m; v++) {
      const paid = Math.max(0, Math.min(n, m - v));
      book += (n - paid) * emi * (inp.casesPerMonth[v - 1] ?? 0);
    }
    cumD += disbursed; cumP += pc[m - 1];
    const principalOutstanding = cumD - cumP; // end-of-month outstanding principal
    monthly.push({
      month: m, cases, disbursed,
      interestIncome: ii[m - 1], principalCollected: pc[m - 1],
      emiCollection: ii[m - 1] + pc[m - 1],
      receivablesBook: book,
      principalOutstanding,
      costOfCapital: principalOutstanding * (inp.costOfCapitalPct / 12),
      processingFee: disbursed * inp.processingFeePct,
      fundsRequired: disbursed - pc[m - 1],
    });
  }
  const Y = (f: (r: MonthlyRow) => number, y: number) =>
    monthly.slice((y - 1) * 12, y * 12).reduce((s, row) => s + f(row), 0);
  const years = [1, 2, 3].map((y) => {
    const disbursedValue = Y((r) => r.disbursed, y);
    const interestIncome = Y((r) => r.interestIncome, y);
    const processingFee = Y((r) => r.processingFee, y);
    const totalIncome = interestIncome + processingFee;
    const costOfCapital = Y((r) => r.costOfCapital, y);
    const cac = disbursedValue * inp.cacPct;
    const directCost = costOfCapital + cac;
    const contribution = totalIncome - directCost;
    const yearEndBook = monthly[y * 12 - 1].receivablesBook;
    const provision = yearEndBook * (inp.provisionBlendedRate[y - 1] ?? 0);
    const techCost = inp.techCost[y - 1] ?? 0;
    const operationsCost = inp.operationsCost[y - 1] ?? 0;
    const marketingCost = inp.marketingCost[y - 1] ?? 0;
    const setupCost = inp.setupCost[y - 1] ?? 0;
    const expense = techCost + operationsCost + marketingCost + provision;
    const ebitda = contribution - expense;
    return {
      disbursedValue, disbursedCount: Y((r) => r.cases, y),
      interestIncome, processingFee, totalIncome,
      costOfCapital, cac, directCost, contribution,
      techCost, operationsCost, marketingCost, provision,
      expense, ebitda, setupCost, ebitdaAfterSetup: ebitda - setupCost,
      yearEndBook,
    } as YearPL;
  }) as [YearPL, YearPL, YearPL];
  return { monthly, years, emi };
}
