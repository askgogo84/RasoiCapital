// app/api/score-derived/route.ts
// Fresh endpoint that runs the EXISTING lib/scoring.ts runScoring() with
// inputs where avgMonthlySales + qqGrowth come from a reconciliation (derived),
// and margin/location/ambience/cibil come from the analyst (manual).
// It does NOT modify or replace the existing scoring path — purely additive.
// Persists a credit_score_runs row with input_provenance + reconciliation_id.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runScoring, type ScoringInput } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 30;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Body {
  outlet_name: string;
  application_id?: string | null;
  reconciliation_id?: string | null;
  outletCategory: string;      // A/B/C/D  (manual)
  locationCode: string;        // A-E      (manual)
  ambiencePos: number;         // 0-3      (manual)
  ambienceAvg: number;         // 0-3      (manual)
  cibilScore: number;          //          (manual)
  cycleNumber?: number;
  tenureMonths?: number;
  avgMonthlySalesInr: number;  // derived (or overridden)
  qqGrowthPct: number;         // derived (or overridden)
  provenance?: Record<string, "DERIVED" | "MANUAL" | "MANUAL_OVERRIDE" | "ASSUMED">;
  disBand?: "TRUSTED" | "REVIEW" | "FLAGGED" | null;
}

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json()) as Body;
    if (!b.outlet_name?.trim())
      return NextResponse.json({ error: "outlet_name is required" }, { status: 400 });

    const input: ScoringInput = {
      outletCategory: b.outletCategory,
      avgMonthlySalesInr: Number(b.avgMonthlySalesInr) || 0,
      qqGrowthPct: Number(b.qqGrowthPct) || 0,
      locationCode: b.locationCode,
      ambiencePos: Number(b.ambiencePos) || 0,
      ambienceAvg: Number(b.ambienceAvg) || 0,
      cibilScore: Number(b.cibilScore) || 0,
      cycleNumber: b.cycleNumber || 1,
      tenureMonths: b.tenureMonths && b.tenureMonths > 0 ? b.tenureMonths : 24,
    };

    const result = runScoring(input);

    // Data-integrity override: a FLAGGED reconciliation forces P bucket / manual review,
    // no matter how good the 6-factor score is. Clean-looking scores must never
    // override direct evidence of manipulated inputs.
    let integrityOverride = false;
    let effectiveBucket = result.bucket;
    let effectiveDecision = result.decision;
    if (b.disBand === "FLAGGED") {
      integrityOverride = true;
      effectiveBucket = "P";
      effectiveDecision = "manual_review_data_integrity";
    }

    // Persist (best-effort) into the full credit_score_runs schema.
    // outlet_id/application_id are optional FKs; we store by name-free run for the demo
    // and link application_id when provided. Persistence never blocks the returned score.
    let scoreRunId: string | null = null;
    try {
      const lt = result.loanTerms;
      const { data, error } = await supabaseAdmin
        .from("credit_score_runs")
        .insert({
          application_id: b.application_id ?? null,
          avg_monthly_sales_inr: input.avgMonthlySalesInr,
          outlet_margin_pct: result.marginPct,
          qq_growth_pct: input.qqGrowthPct,
          location_code: input.locationCode,
          cibil_score: input.cibilScore,
          ambience_pos_count: input.ambiencePos,
          ambience_avg_count: input.ambienceAvg,
          score_margin: result.factors.margin,
          score_qq_growth: result.factors.qqGrowth,
          score_avg_sales: result.factors.avgSales,
          score_location: result.factors.location,
          score_ambience: result.factors.ambience,
          score_cibil: result.factors.cibil,
          composite_score: result.compositeScore,
          bucket: effectiveBucket,
          bucket_label: effectiveBucket === "G" ? "Good" : effectiveBucket === "C" ? "Consider" : "Pause",
          decision: effectiveDecision,
          interest_rate_pct: lt.interestRatePct,
          processing_fee_pct: lt.processingFeePct,
          emi_pct_of_margin: lt.emiPctOfMargin,
          monthly_emi_inr: lt.monthlyEmiInr,
          loan_tenure_months: lt.tenureMonths,
          calculated_loan_amt_inr: lt.rawLoanAmtInr,
          eligible_loan_amt_inr: lt.finalLoanAmtInr,
          disbursement_amt_inr: lt.disbursementInr,
          collateral_required: lt.collateralRequired,
          scoring_model_version: "v2-derived",
          input_provenance: b.provenance ?? {},
          reconciliation_id: b.reconciliation_id ?? null,
        })
        .select("id")
        .single();
      if (!error) scoreRunId = data?.id ?? null;
      else console.warn("credit_score_runs insert warning:", error.message);
    } catch (e: any) {
      console.warn("credit_score_runs insert skipped:", e?.message);
      // Score still returns — persistence is non-blocking for the demo.
    }

    return NextResponse.json({
      score_run_id: scoreRunId,
      composite_score: result.compositeScore,
      factors: result.factors,
      bucket: effectiveBucket,
      bucket_label:
        effectiveBucket === "G" ? "Good" : effectiveBucket === "C" ? "Consider" : "Pause",
      decision: effectiveDecision,
      integrity_override: integrityOverride,
      margin_pct: result.marginPct,
      loan_terms: result.loanTerms,
      below_par: result.belowPar,
      provenance: b.provenance ?? {},
    });
  } catch (err: any) {
    console.error("score-derived error:", err?.message);
    return NextResponse.json({ error: "scoring failed", detail: String(err?.message ?? err) }, { status: 500 });
  }
}
