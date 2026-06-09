import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'active'
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('active_loans')
      .select(`*, outlet:outlets(outlet_name, city)`)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
