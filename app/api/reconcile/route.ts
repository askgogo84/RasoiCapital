// app/api/reconcile/route.ts
// POST { outlet_name: string, application_id?: uuid }
// Pulls parsed docs for the outlet, runs matcher + monthly + DIS,
// persists a uw_reconciliations row, returns the full result.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { matchPayouts, type PayoutForMatch, type BankTxnForMatch } from "@/lib/reconcile/matcher";
import { buildMonthlySeries, type PayoutMonthly } from "@/lib/reconcile/monthly";
import { computeIntegrity } from "@/lib/reconcile/integrity";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const outletName = String(body.outlet_name ?? "").trim();
    const applicationId = body.application_id ?? null;
    if (!outletName) return NextResponse.json({ error: "outlet_name is required" }, { status: 400 });

    // Fetch this outlet's parsed documents
    const { data: docs, error: docErr } = await supabaseAdmin
      .from("uw_documents")
      .select("id, doc_type, parse_status")
      .eq("outlet_name", outletName)
      .eq("parse_status", "parsed");
    if (docErr) throw new Error(`uw_documents fetch failed: ${docErr.message}`);
    if (!docs || docs.length === 0)
      return NextResponse.json({ error: "no parsed documents for this outlet" }, { status: 404 });

    const docIds = docs.map((d) => d.id);

    // Bank transactions
    const { data: bankRows, error: bankErr } = await supabaseAdmin
      .from("uw_bank_txns")
      .select("id, txn_date, description, amount, direction, category")
      .in("document_id", docIds);
    if (bankErr) throw new Error(`uw_bank_txns fetch failed: ${bankErr.message}`);

    // Payout settlements
    const { data: payoutRows, error: payErr } = await supabaseAdmin
      .from("uw_payouts")
      .select("id, platform, period_end, gross_sales, net_payout")
      .in("document_id", docIds);
    if (payErr) throw new Error(`uw_payouts fetch failed: ${payErr.message}`);

    const bankTxns: BankTxnForMatch[] = (bankRows ?? []).map((t) => ({
      id: t.id,
      txn_date: t.txn_date,
      amount: Number(t.amount),
      direction: t.direction,
      category: t.category ?? "OTHER",
      description: t.description ?? "",
    }));

    const payoutsForMatch: PayoutForMatch[] = (payoutRows ?? []).map((p) => ({
      id: p.id,
      platform: p.platform,
      period_end: p.period_end,
      net_payout: Number(p.net_payout),
    }));

    const payoutsMonthly: PayoutMonthly[] = (payoutRows ?? []).map((p) => ({
      platform: p.platform,
      period_end: p.period_end,
      gross_sales: p.gross_sales != null ? Number(p.gross_sales) : null,
      net_payout: Number(p.net_payout),
    }));

    // Run the engine
    const match = matchPayouts(payoutsForMatch, bankTxns);
    const monthly = buildMonthlySeries(payoutsMonthly, bankTxns);
    const integrity = computeIntegrity({
      match_rate: match.match_rate,
      monthlyPlatformNet: monthly.monthlyPlatformNet,
      monthlyBankAggregator: monthly.monthlyBankAggregator,
      bankTxns,
    });

    // Persist matched_txn_id back onto payouts (best-effort)
    for (const m of match.matched) {
      await supabaseAdmin.from("uw_payouts").update({ matched_txn_id: m.txn_id }).eq("id", m.payout_id);
    }

    // Persist reconciliation row
    const { data: recon, error: recErr } = await supabaseAdmin
      .from("uw_reconciliations")
      .insert({
        application_id: applicationId,
        outlet_name: outletName,
        match_rate: match.match_rate,
        variance_score: integrity.variance_score,
        anomaly_score: integrity.anomaly_score,
        dis: integrity.dis,
        dis_band: integrity.band,
        anomalies: integrity.anomalies,
        monthly_series: monthly.months,
        derived_avg_monthly_sales: monthly.derived_avg_monthly_sales,
        derived_qq_growth: monthly.derived_qq_growth,
      })
      .select("id")
      .single();
    if (recErr) throw new Error(`uw_reconciliations insert failed: ${recErr.message}`);

    return NextResponse.json({
      reconciliation_id: recon.id,
      match: {
        rate: Math.round(match.match_rate * 1000) / 10, // %
        matched: match.matched.length,
        unmatched_payouts: match.unmatched_payouts.length,
        total_payout_net: match.total_payout_net,
      },
      integrity: {
        dis: integrity.dis,
        band: integrity.band,
        match_rate_score: integrity.match_rate_score,
        variance_score: integrity.variance_score,
        anomaly_score: integrity.anomaly_score,
        anomaly_count: integrity.anomalies.length,
        anomalies: integrity.anomalies,
      },
      derived: {
        avg_monthly_sales: monthly.derived_avg_monthly_sales,
        qq_growth_pct: monthly.derived_qq_growth,
      },
      monthly_series: monthly.months,
    });
  } catch (err: any) {
    console.error("reconcile route error:", err?.message);
    return NextResponse.json({ error: "reconcile failed", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
