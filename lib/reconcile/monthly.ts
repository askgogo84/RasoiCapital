// lib/reconcile/monthly.ts
// Builds the monthly sales series and QoQ growth from parsed + matched data.
// Output shape is compatible with the existing monthly_sales_summary concept.

import type { BankTxnForMatch } from "./matcher";

export interface PayoutMonthly {
  platform: "zomato" | "swiggy";
  period_end: string | null;
  gross_sales: number | null;
  net_payout: number;
}

export interface MonthRow {
  month: string;                 // YYYY-MM
  platform_gross: number;        // sum of platform gross_sales in month
  platform_net: number;          // sum of net payouts in month
  bank_aggregator_credit: number;// bank credits categorized as platform settlements
  dinein_credits: number;        // UPI + CARD + CASH_DEPOSIT credits
  cash_deposit: number;          // CASH_DEPOSIT only (visible cash)
  total_observed_sales: number;  // platform_gross + dinein_credits
  verified: boolean;             // has both platform and bank data
}

export interface MonthlySeries {
  months: MonthRow[];
  derived_avg_monthly_sales: number;   // mean of last 3 months total_observed_sales
  derived_qq_growth: number | null;    // mean QoQ growth %, null if <2 quarters
  monthlyPlatformNet: number[];        // net payouts per month, for variance calc
  monthlyBankAggregator: number[];     // bank aggregator credits per month, for variance calc
}

function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function buildMonthlySeries(
  payouts: PayoutMonthly[],
  bankTxns: BankTxnForMatch[]
): MonthlySeries {
  const monthsSet = new Set<string>();
  for (const t of bankTxns) monthsSet.add(monthOf(t.txn_date));
  for (const p of payouts) if (p.period_end) monthsSet.add(monthOf(p.period_end));
  const months = Array.from(monthsSet).sort();

  const rows: MonthRow[] = months.map((m) => {
    const pm = payouts.filter((p) => p.period_end && monthOf(p.period_end) === m);
    const tm = bankTxns.filter((t) => monthOf(t.txn_date) === m);

    const platform_gross = pm.reduce((s, p) => s + (p.gross_sales ?? 0), 0);
    const platform_net = pm.reduce((s, p) => s + p.net_payout, 0);
    const bank_aggregator_credit = tm
      .filter((t) => t.direction === "credit" &&
        (t.category === "ZOMATO_SETTLEMENT" || t.category === "SWIGGY_SETTLEMENT"))
      .reduce((s, t) => s + t.amount, 0);
    const dineinCredits = tm.filter(
      (t) => t.direction === "credit" &&
        (t.category === "UPI" || t.category === "CARD" || t.category === "CASH_DEPOSIT")
    );
    const dinein_credits = dineinCredits.reduce((s, t) => s + t.amount, 0);
    const cash_deposit = tm
      .filter((t) => t.direction === "credit" && t.category === "CASH_DEPOSIT")
      .reduce((s, t) => s + t.amount, 0);

    return {
      month: m,
      platform_gross: Math.round(platform_gross),
      platform_net: Math.round(platform_net),
      bank_aggregator_credit: Math.round(bank_aggregator_credit),
      dinein_credits: Math.round(dinein_credits),
      cash_deposit: Math.round(cash_deposit),
      total_observed_sales: Math.round(platform_gross + dinein_credits),
      verified: platform_gross > 0 && bank_aggregator_credit > 0,
    };
  });

  // avg of last 3 months observed sales
  const last3 = rows.slice(-3);
  const derived_avg_monthly_sales = last3.length
    ? Math.round(last3.reduce((s, r) => s + r.total_observed_sales, 0) / last3.length)
    : 0;

  // QoQ growth on a CONSISTENT basis across all months: total bank credits
  // (aggregator settlements + dine-in). Platform gross only covers recent months,
  // so using observed_sales would create a false step-up; bank credits span the full statement.
  const consistentMonthly = rows.map(
    (r) => r.bank_aggregator_credit + r.dinein_credits
  );
  const qtrTotals: number[] = [];
  for (let i = 0; i + 3 <= consistentMonthly.length; i += 3) {
    qtrTotals.push(consistentMonthly.slice(i, i + 3).reduce((a, b) => a + b, 0));
  }
  let derived_qq_growth: number | null = null;
  if (qtrTotals.length >= 2) {
    const growths: number[] = [];
    for (let i = 1; i < qtrTotals.length; i++) {
      if (qtrTotals[i - 1] > 0) growths.push((qtrTotals[i] - qtrTotals[i - 1]) / qtrTotals[i - 1]);
    }
    if (growths.length) {
      derived_qq_growth = Math.round((growths.reduce((a, b) => a + b, 0) / growths.length) * 1000) / 10; // %
    }
  }

  return {
    months: rows,
    derived_avg_monthly_sales,
    derived_qq_growth,
    monthlyPlatformNet: rows.map((r) => r.platform_net),
    monthlyBankAggregator: rows.map((r) => r.bank_aggregator_credit),
  };
}
