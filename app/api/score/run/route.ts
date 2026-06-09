import { NextRequest, NextResponse } from 'next/server'
import { runScoring, ScoringInput } from '@/lib/scoring'
import { createAdminClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const input: ScoringInput = {
      outletCategory:       body.outletCategory,
      avgMonthlySalesInr:   Number(body.avgMonthlySalesInr) * 100000,
      qqGrowthPct:          Number(body.qqGrowthPct),
      locationCode:         body.locationCode,
      ambiencePos:          Number(body.ambiencePos || 0),
      ambienceAvg:          Number(body.ambienceAvg || 0),
      cibilScore:           Number(body.cibilScore),
      cycleNumber:          Number(body.cycleNumber || 1),
    }

    // Run scoring engine
    const result = runScoring(input)

    // Build AI prompt for risk narrative
    const aiPrompt = `You are a senior credit underwriter at Rasoi Capital, an AI-powered HORECA lending platform in India.

Analyse this loan application and return ONLY a JSON object (no markdown, no explanation outside JSON):

OUTLET: ${body.outletName || 'Unknown'} | ${body.outletType || 'Restaurant'} | ${body.city || 'Bengaluru'}
MENU CATEGORY: ${input.outletCategory} (outlet margin: ${result.marginPct}%)
AVG MONTHLY SALES: â‚¹${(input.avgMonthlySalesInr/100000).toFixed(1)}L
Q-Q GROWTH: ${input.qqGrowthPct}%
LOCATION: Category ${input.locationCode}
CIBIL: ${input.cibilScore}
OWNER EXPERIENCE: ${body.ownerExperienceYrs || 'Not specified'} years
LEASE REMAINING: ${body.leaseMonthsRemaining || 'Not specified'} months
LOAN PURPOSE: ${body.loanPurpose || 'Working capital'}
EXISTING OBLIGATIONS (FOIR): ${body.foirLevel || 'Not specified'}

SCORE RESULT:
- Composite: ${result.compositeScore}/5.0
- Bucket: ${result.bucket} (${result.bucketLabel})
- Decision: ${result.decision}
- Factor scores: Margin ${result.factors.margin}/5 Â· Growth ${result.factors.qqGrowth}/5 Â· Sales ${result.factors.avgSales}/5 Â· Location ${result.factors.location}/5 Â· Ambience ${result.factors.ambience}/5 Â· CIBIL ${result.factors.cibil}/5

LOAN TERMS:
- Amount: â‚¹${(result.loanTerms.finalLoanAmtInr/100000).toFixed(2)}L
- Rate: ${result.loanTerms.interestRatePct}% p.a.
- Tenure: ${result.loanTerms.tenureMonths} months
- Daily EMI: â‚¹${result.loanTerms.dailyEmiInr}
- Collateral: ${result.loanTerms.collateralRequired ? 'Required' : 'Not required'}

Return this JSON:
{
  "narrative": "2-paragraph professional credit memo. Para 1: overall risk profile and strengths. Para 2: concerns and conditions.",
  "weakFactors": "Which 1-2 factors dragged the score most and why this matters for HORECA lending.",
  "improvementPath": "3 specific, actionable steps this borrower can take to improve eligibility next cycle.",
  "competitorContext": "One sentence: how does this offer compare to what PhonePe/Paytm or LendingKart would offer this borrower?"
}`

    let aiNarrative = null
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: aiPrompt }],
      })
      const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
      const clean = raw.replace(/```json|```/g, '').trim()
      aiNarrative = JSON.parse(clean)
    } catch (e) {
      console.error('AI narrative failed:', e)
    }

    // Persist to Supabase if outlet_id provided
    let scoreRunId = null
    if (body.outletId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createAdminClient()
        const { data } = await supabase
          .from('credit_score_runs')
          .insert({
            outlet_id:              body.outletId,
            avg_monthly_sales_inr:  input.avgMonthlySalesInr,
            outlet_margin_pct:      result.marginPct,
            qq_growth_pct:          input.qqGrowthPct,
            location_code:          input.locationCode,
            cibil_score:            input.cibilScore,
            ambience_pos_count:     input.ambiencePos,
            ambience_avg_count:     input.ambienceAvg,
            score_margin:           result.factors.margin,
            score_qq_growth:        result.factors.qqGrowth,
            score_avg_sales:        result.factors.avgSales,
            score_location:         result.factors.location,
            score_ambience:         result.factors.ambience,
            score_cibil:            result.factors.cibil,
            composite_score:        result.compositeScore,
            bucket:                 result.bucket,
            bucket_label:           result.bucketLabel,
            decision:               result.decision,
            interest_rate_pct:      result.loanTerms.interestRatePct,
            processing_fee_pct:     result.loanTerms.processingFeePct,
            emi_pct_of_margin:      result.loanTerms.emiPctOfMargin,
            monthly_emi_inr:        result.loanTerms.monthlyEmiInr,
            loan_tenure_months:     result.loanTerms.tenureMonths,
            calculated_loan_amt_inr: result.loanTerms.rawLoanAmtInr,
            eligible_loan_amt_inr:  result.loanTerms.finalLoanAmtInr,
            disbursement_amt_inr:   result.loanTerms.disbursementInr,
            collateral_required:    result.loanTerms.collateralRequired,
            ai_risk_narrative:      aiNarrative?.narrative,
            ai_weak_factors:        aiNarrative?.weakFactors,
            ai_improvement_path:    aiNarrative?.improvementPath,
            ai_competitor_context:  aiNarrative?.competitorContext,
          })
          .select('id')
          .single()
        scoreRunId = data?.id
      } catch (e) {
        console.error('Supabase persist failed:', e)
      }
    }

    return NextResponse.json({
      success: true,
      scoreRunId,
      scoring: result,
      aiNarrative,
    })

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
