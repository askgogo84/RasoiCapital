import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const started = Date.now()
    const today   = new Date()
    const d3 = new Date(today); d3.setDate(d3.getDate() + 3)
    const d1 = new Date(today); d1.setDate(d1.getDate() + 1)

    const fmt = (d: Date) => d.toISOString().split('T')[0]

    // Find EMIs due in 3 days and 1 day
    const { data: upcomingEmis, error } = await supabase
      .from('emi_schedule')
      .select(`
        id, loan_id, due_date, emi_amount,
        loan:active_loans(
          loan_number,
          outlet:outlets(
            outlet_name,
            owner:user_profiles(mobile, full_name)
          )
        )
      `)
      .in('due_date', [fmt(d3), fmt(d1)])
      .eq('status', 'pending')

    if (error) throw error

    let sent = 0
    // In production: call MSG91 API here for each
    // For now: log notification records
    for (const emi of (upcomingEmis || [])) {
      const daysOut = emi.due_date === fmt(d1) ? 1 : 3
      await supabase.from('notifications').insert({
        loan_id:           emi.loan_id,
        notification_type: 'emi_due',
        channel:           'sms',
        message_text:      `Reminder: Your EMI of ₹${emi.emi_amount} is due in ${daysOut} day(s). Pay via Rasoi Capital app.`,
        status:            'pending',
        scheduled_at:      new Date().toISOString(),
      })
      sent++
    }

    await supabase.from('cron_logs').insert({
      job_name:    'emi-reminders',
      status:      'success',
      details:     { reminders_queued: sent },
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    })

    return NextResponse.json({ success: true, reminders_queued: sent })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
