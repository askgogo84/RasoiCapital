// lib/reconcile/integrity.ts
// Data Integrity Score (DIS): 0..100 composite of
//   50% settlement match rate + 30% cross-source variance + 20% anomaly score.
// Bands: >=80 TRUSTED, 60..79 REVIEW, <60 FLAGGED.

import type { BankTxnForMatch } from "./matcher";

export interface Anomaly {
  type: "round_number_cluster" | "circular_transfer" | "month_end_spike" | "balance_discontinuity";
  severity: "low" | "medium" | "high";
  detail: string;
  amount?: number;
  date?: string;
}

export interface IntegrityInput {
  match_rate: number;                    // 0..1 from matcher
  monthlyPlatformNet: number[];          // platform NET payouts per month (matches bank aggregator credits)
  monthlyBankAggregator: number[];       // bank aggregator credits per month (same months, same order)
  bankTxns: BankTxnForMatch[];           // full statement, for anomaly scan
}

export interface IntegrityResult {
  dis: number;                           // 0..100
  band: "TRUSTED" | "REVIEW" | "FLAGGED";
  match_rate_score: number;              // 0..1
  variance_score: number;                // 0..1
  anomaly_score: number;                 // 0..1
  fraud_override: boolean;               // true if high-severity anomaly forced FLAGGED
  anomalies: Anomaly[];
}

// ---- variance: agreement between platform NET payout and bank aggregator credit ----
// Only compares months where BOTH sources report data (platform net > 0 AND bank credit > 0).
// Months with no payout document are excluded — absence of a doc is not a discrepancy.
function varianceScore(platformNet: number[], bank: number[]): number {
  const n = Math.min(platformNet.length, bank.length);
  let mapeSum = 0, counted = 0;
  for (let i = 0; i < n; i++) {
    const p = platformNet[i], b = bank[i];
    if (p <= 0 || b <= 0) continue;            // need both sides present to compare
    mapeSum += Math.abs(p - b) / p;
    counted++;
  }
  if (counted === 0) return 0.7;               // no overlapping months → mildly neutral
  const mape = mapeSum / counted;              // 0 = perfect agreement
  return Math.max(0, 1 - Math.min(mape, 1));   // 1 = perfect, 0 = way off
}

// ---- anomaly detection (deterministic, rule-based) ----
export function detectAnomalies(txns: BankTxnForMatch[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const credits = txns.filter((t) => t.direction === "credit");

  // 1. Round-number clusters: many credits that are exact multiples of 50,000
  const roundCredits = credits.filter(
    (t) => t.amount >= 50000 && t.amount % 50000 === 0
  );
  if (roundCredits.length >= 3) {
    const total = roundCredits.reduce((s, t) => s + t.amount, 0);
    anomalies.push({
      type: "round_number_cluster",
      severity: roundCredits.length >= 6 ? "high" : "medium",
      detail: `${roundCredits.length} suspiciously round credits (multiples of ₹50,000) totalling ₹${total.toLocaleString("en-IN")} — possible inflated sales`,
      amount: total,
    });
  }

  // 2. Circular transfers: a credit followed within 3 days by a debit of >=95% to same-ish counterparty
  const sorted = [...txns].sort((a, b) => a.txn_date.localeCompare(b.txn_date));
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    if (c.direction !== "credit" || c.amount < 50000) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const d = sorted[j];
      const gap = Math.round(
        (new Date(d.txn_date).getTime() - new Date(c.txn_date).getTime()) / 86400000
      );
      if (gap > 3) break;
      if (d.direction !== "debit") continue;
      const ratio = d.amount / c.amount;
      if (ratio >= 0.95 && ratio <= 1.05) {
        // token overlap in descriptions = likely same counterparty
        const cw = new Set(c.description.toUpperCase().split(/\W+/).filter((w) => w.length > 3));
        const dw = d.description.toUpperCase().split(/\W+/).filter((w) => w.length > 3);
        const overlap = dw.some((w) => cw.has(w));
        if (overlap) {
          anomalies.push({
            type: "circular_transfer",
            severity: "high",
            detail: `₹${c.amount.toLocaleString("en-IN")} credited ${c.txn_date} then ₹${d.amount.toLocaleString("en-IN")} debited ${d.txn_date} to same counterparty — possible round-tripping`,
            amount: c.amount,
            date: c.txn_date,
          });
          break;
        }
      }
    }
  }

  // 3. Month-end spikes: credits in last 2 days of a month > 3σ above that month's credit mean
  const byMonth: Record<string, BankTxnForMatch[]> = {};
  for (const t of credits) {
    const m = t.txn_date.slice(0, 7);
    (byMonth[m] ??= []).push(t);
  }
  for (const [m, list] of Object.entries(byMonth)) {
    if (list.length < 5) continue;
    const amts = list.map((t) => t.amount);
    const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
    const sd = Math.sqrt(amts.reduce((s, a) => s + (a - mean) ** 2, 0) / amts.length);
    if (sd === 0) continue;
    for (const t of list) {
      const day = parseInt(t.txn_date.slice(8, 10), 10);
      const isMonthEnd = day >= 27;
      if (isMonthEnd && t.amount > mean + 3 * sd) {
        anomalies.push({
          type: "month_end_spike",
          severity: "medium",
          detail: `₹${t.amount.toLocaleString("en-IN")} credit on ${t.txn_date} is >3σ above ${m} average — unusual month-end inflow`,
          amount: t.amount,
          date: t.txn_date,
        });
      }
    }
  }

  return anomalies;
}

function anomalyScore(anoms: Anomaly[]): number {
  // start at 1.0, subtract weighted penalties, floor at 0
  let penalty = 0;
  for (const a of anoms) {
    penalty += a.severity === "high" ? 0.25 : a.severity === "medium" ? 0.12 : 0.05;
  }
  return Math.max(0, 1 - penalty);
}

export function computeIntegrity(input: IntegrityInput): IntegrityResult {
  const match_rate_score = Math.max(0, Math.min(1, input.match_rate));
  const variance_score = varianceScore(input.monthlyPlatformNet, input.monthlyBankAggregator);
  const anomalies = detectAnomalies(input.bankTxns);
  const anomaly_score = anomalyScore(anomalies);

  const dis = Math.round(
    (0.5 * match_rate_score + 0.3 * variance_score + 0.2 * anomaly_score) * 100
  );

  // Hard fraud override: high-severity anomalies force a FLAG regardless of DIS,
  // because clean surface numbers must never override direct evidence of manipulation.
  const highSev = anomalies.filter((a) => a.severity === "high").length;
  let band: "TRUSTED" | "REVIEW" | "FLAGGED";
  if (highSev >= 1) {
    band = "FLAGGED";
  } else {
    band = dis >= 80 ? "TRUSTED" : dis >= 60 ? "REVIEW" : "FLAGGED";
  }

  return {
    dis,
    band,
    fraud_override: highSev >= 1,
    match_rate_score: Math.round(match_rate_score * 100) / 100,
    variance_score: Math.round(variance_score * 100) / 100,
    anomaly_score: Math.round(anomaly_score * 100) / 100,
    anomalies,
  };
}
