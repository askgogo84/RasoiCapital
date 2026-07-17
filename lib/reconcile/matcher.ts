// lib/reconcile/matcher.ts
// Deterministic matching of platform payout settlements against bank credits.
// NO LLM here — pure amount + date-window math. Auditable by design.

export interface PayoutForMatch {
  id: string;
  platform: "zomato" | "swiggy";
  period_end: string | null;    // YYYY-MM-DD
  net_payout: number;
}

export interface BankTxnForMatch {
  id: string;
  txn_date: string;             // YYYY-MM-DD
  amount: number;
  direction: "credit" | "debit";
  category: string;
  description: string;
}

export interface MatchPair {
  payout_id: string;
  txn_id: string;
  payout_amount: number;
  txn_amount: number;
  diff: number;
  days_gap: number;
}

export interface MatchResult {
  matched: MatchPair[];
  unmatched_payouts: PayoutForMatch[];
  unmatched_settlement_credits: BankTxnForMatch[];
  match_rate: number;           // matched_net / total_payout_net (0..1)
  total_payout_net: number;
  matched_net: number;
}

const AMOUNT_TOL_ABS = 10;      // ₹10 absolute tolerance
const AMOUNT_TOL_PCT = 0.005;   // or 0.5% of payout, whichever is larger
const DAYS_MIN = 0;
const DAYS_MAX = 7;             // settlement lands T+0..T+7 after period end

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86400000);
}

function amountOk(payout: number, credit: number): boolean {
  const tol = Math.max(AMOUNT_TOL_ABS, payout * AMOUNT_TOL_PCT);
  return Math.abs(payout - credit) <= tol;
}

/**
 * Greedy matcher: for each payout (largest first), pick the closest-amount
 * eligible unused bank credit within the date window. Greedy-by-largest keeps
 * big settlements from being stolen by coincidental small-credit matches.
 */
export function matchPayouts(
  payouts: PayoutForMatch[],
  bankTxns: BankTxnForMatch[]
): MatchResult {
  // Only aggregator settlement credits are matching candidates.
  const candidates = bankTxns.filter(
    (t) =>
      t.direction === "credit" &&
      (t.category === "ZOMATO_SETTLEMENT" || t.category === "SWIGGY_SETTLEMENT")
  );

  const used = new Set<string>();
  const matched: MatchPair[] = [];

  const sortedPayouts = [...payouts].sort((a, b) => b.net_payout - a.net_payout);

  for (const p of sortedPayouts) {
    if (!p.period_end) continue;
    let best: { txn: BankTxnForMatch; diff: number; gap: number } | null = null;
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      const gap = daysBetween(p.period_end, c.txn_date);
      if (gap < DAYS_MIN || gap > DAYS_MAX) continue;
      if (!amountOk(p.net_payout, c.amount)) continue;
      const diff = Math.abs(p.net_payout - c.amount);
      if (!best || diff < best.diff) best = { txn: c, diff, gap };
    }
    if (best) {
      used.add(best.txn.id);
      matched.push({
        payout_id: p.id,
        txn_id: best.txn.id,
        payout_amount: p.net_payout,
        txn_amount: best.txn.amount,
        diff: Math.round(best.diff * 100) / 100,
        days_gap: best.gap,
      });
    }
  }

  const matchedPayoutIds = new Set(matched.map((m) => m.payout_id));
  const matchedTxnIds = new Set(matched.map((m) => m.txn_id));

  const total_payout_net = payouts.reduce((s, p) => s + p.net_payout, 0);
  const matched_net = matched.reduce((s, m) => s + m.payout_amount, 0);

  return {
    matched,
    unmatched_payouts: payouts.filter((p) => !matchedPayoutIds.has(p.id)),
    unmatched_settlement_credits: candidates.filter((c) => !matchedTxnIds.has(c.id)),
    match_rate: total_payout_net > 0 ? matched_net / total_payout_net : 0,
    total_payout_net: Math.round(total_payout_net * 100) / 100,
    matched_net: Math.round(matched_net * 100) / 100,
  };
}
