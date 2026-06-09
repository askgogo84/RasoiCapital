import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const city   = searchParams.get('city')

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from('loan_applications')
      .select(`
        *,
        outlet:outlets(outlet_name, outlet_type_id, city, location_type_code),
        score_run:credit_score_runs(composite_score, bucket, decision, eligible_loan_amt_inr)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('loan_applications')
      .insert({
        outlet_id:              body.outletId,
        score_run_id:           body.scoreRunId,
        loan_purpose:           body.loanPurpose || 'working_capital',
        loan_purpose_detail:    body.loanPurposeDetail,
        requested_amount_inr:   body.requestedAmountInr,
        requested_tenure_months: body.requestedTenureMonths,
        cycle_number:           body.cycleNumber || 1,
        status:                 'submitted',
        submitted_at:           new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
