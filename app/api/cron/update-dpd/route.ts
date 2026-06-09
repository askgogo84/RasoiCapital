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

    // Call the Postgres function
    const { data, error } = await supabase.rpc('update_all_dpd_buckets')
    if (error) throw error

    // Log the run
    await supabase.from('cron_logs').insert({
      job_name:    'update-dpd',
      status:      'success',
      details:     { updated_count: data },
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    })

    return NextResponse.json({
      success: true,
      updated: data,
      ran_at: new Date().toISOString(),
    })
  } catch (err: any) {
    const supabase = createAdminClient()
    await supabase.from('cron_logs').insert({
      job_name: 'update-dpd',
      status:   'failed',
      error_msg: err.message,
    })
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
