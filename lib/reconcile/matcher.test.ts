// lib/reconcile/matcher.test.ts
// Proves settlement matching is POOLED across every aggregator platform:
// Zomato/Swiggy still match, and ONDC / Ownly / Magicpin / OTHER now match too —
// all in one pass, one combined match_rate. Matching math (tolerance, T+0..7
// window, greedy-by-largest) is unchanged; this only exercises the widened
// candidate filter.
import { describe, it, expect } from "vitest";
import { matchPayouts, isSettlementCategory, type PayoutForMatch, type BankTxnForMatch } from "./matcher";

const payout = (id: string, platform: string, period_end: string, net: number): PayoutForMatch =>
  ({ id, platform, period_end, net_payout: net });

const credit = (id: string, txn_date: string, amount: number, category: string): BankTxnForMatch =>
  ({ id, txn_date, amount, direction: "credit", category, description: category });

describe("isSettlementCategory", () => {
  it("accepts any *_SETTLEMENT, rejects others", () => {
    for (const c of ["ZOMATO_SETTLEMENT", "SWIGGY_SETTLEMENT", "ONDC_SETTLEMENT", "OWNLY_SETTLEMENT", "MAGICPIN_SETTLEMENT", "OTHER_SETTLEMENT"])
      expect(isSettlementCategory(c)).toBe(true);
    for (const c of ["UPI", "CARD", "CASH_DEPOSIT", "TRANSFER_IN", "OTHER"])
      expect(isSettlementCategory(c)).toBe(false);
  });
});

describe("matchPayouts — existing Zomato/Swiggy behaviour intact", () => {
  it("matches a Zomato settlement within the T+0..7 window and tolerance", () => {
    const payouts = [payout("z1", "zomato", "2025-01-07", 84000)];
    const bank = [credit("b1", "2025-01-09", 84010, "ZOMATO_SETTLEMENT")]; // +2 days, ₹10 diff (ok)
    const r = matchPayouts(payouts, bank);
    expect(r.matched).toHaveLength(1);
    expect(r.match_rate).toBe(1);
  });

  it("matches a Swiggy settlement", () => {
    const r = matchPayouts(
      [payout("s1", "swiggy", "2025-02-14", 51000)],
      [credit("b1", "2025-02-16", 51000, "SWIGGY_SETTLEMENT")]
    );
    expect(r.matched).toHaveLength(1);
    expect(r.match_rate).toBe(1);
  });
});

describe("matchPayouts — new platforms now match (pooled)", () => {
  it("matches an ONDC settlement", () => {
    const r = matchPayouts(
      [payout("o1", "ondc", "2025-03-07", 30000)],
      [credit("b1", "2025-03-10", 29950, "ONDC_SETTLEMENT")] // +3d, ₹50 diff < 0.5%*30000=150
    );
    expect(r.matched).toHaveLength(1);
    expect(r.matched[0].payout_id).toBe("o1");
    expect(r.match_rate).toBe(1);
  });

  it("matches an OTHER_SETTLEMENT (generic aggregator)", () => {
    const r = matchPayouts(
      [payout("x1", "dotpe", "2025-04-30", 12000)],
      [credit("b1", "2025-05-02", 12000, "OTHER_SETTLEMENT")]
    );
    expect(r.matched).toHaveLength(1);
    expect(r.match_rate).toBe(1);
  });

  it("pools Zomato + Swiggy + ONDC + Magicpin + OTHER in a single pass → one match_rate", () => {
    const payouts = [
      payout("z1", "zomato", "2025-06-07", 90000),
      payout("s1", "swiggy", "2025-06-07", 60000),
      payout("o1", "ondc", "2025-06-07", 30000),
      payout("m1", "magicpin", "2025-06-07", 20000),
      payout("w1", "ownly", "2025-06-07", 15000),
    ];
    const bank = [
      credit("bz", "2025-06-09", 90000, "ZOMATO_SETTLEMENT"),
      credit("bs", "2025-06-10", 60000, "SWIGGY_SETTLEMENT"),
      credit("bo", "2025-06-11", 30000, "ONDC_SETTLEMENT"),
      credit("bm", "2025-06-12", 20000, "MAGICPIN_SETTLEMENT"),
      credit("bw", "2025-06-13", 15000, "OWNLY_SETTLEMENT"),
      credit("bu", "2025-06-08", 45000, "UPI"), // dine-in credit, NOT a candidate
    ];
    const r = matchPayouts(payouts, bank);
    expect(r.matched).toHaveLength(5);          // every platform matched, one pass
    expect(r.match_rate).toBe(1);               // one combined rate across platforms
    expect(r.total_payout_net).toBe(215000);
    // the UPI credit is not a settlement candidate, so it is never consumed
    expect(r.unmatched_settlement_credits.find((c) => c.id === "bu")).toBeUndefined();
  });

  it("does not match a payout against a non-settlement credit (UPI)", () => {
    const r = matchPayouts(
      [payout("o1", "ondc", "2025-07-07", 30000)],
      [credit("b1", "2025-07-09", 30000, "UPI")] // right amount/date but wrong category
    );
    expect(r.matched).toHaveLength(0);
    expect(r.match_rate).toBe(0);
  });
});
