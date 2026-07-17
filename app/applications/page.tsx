'use client'
import { useState, useEffect } from 'react'

const STATUS_CHIP: Record<string, string> = {
  submitted: 'current',
  under_review: 'soft',
  approved: 'current',
  conditionally_approved: 'soft',
  rejected: 'hard',
  disbursed: 'current',
  draft: 'man',
}

const BUCKET_COLORS: Record<string, string> = {
  G: 'current', C: 'soft', P: 'hard'
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/applications/route')
      .then(r => r.json())
      .then(d => { setApps(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? apps : apps.filter(a => a.status === filter)

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--rc-fg)' }}>Loan Applications</h1>
          <p className="rc-eyebrow" style={{ marginTop: 4 }}>Review, approve and disburse</p>
        </div>
        <a href="/underwrite" className="rc-btn" style={{ width: 'auto', padding: '10px 16px', fontSize: 14 }}>
          + New Assessment
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all','submitted','under_review','approved','disbursed','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  className={filter === s ? 'rc-btn' : 'rc-btn rc-btn-ghost'}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12" style={{ color: 'var(--rc-dim)' }}>Loading applications…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rc-panel text-center" style={{ padding: 48 }}>
          <div className="text-4xl mb-3">📋</div>
          <div className="font-semibold mb-1" style={{ color: 'var(--rc-fg)' }}>No applications yet</div>
          <p className="text-sm" style={{ color: 'var(--rc-dim)' }}>Run an underwriting assessment and submit an application to see it here.</p>
          <a href="/underwrite" className="rc-btn inline-block mt-4" style={{ width: 'auto', padding: '10px 16px', fontSize: 14 }}>
            Run Underwriting
          </a>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rc-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="rc-table">
            <thead>
              <tr>
                {['App No.','Outlet','City','Score','Bucket','Amount','Status','Date'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id}>
                  <td className="rc-mono" style={{ color: 'var(--rc-cyan)', fontSize: 12 }}>{app.application_number}</td>
                  <td className="font-medium" style={{ color: 'var(--rc-fg)' }}>{app.outlet?.outlet_name || '—'}</td>
                  <td style={{ color: 'var(--rc-dim)' }}>{app.outlet?.city || '—'}</td>
                  <td className="rc-mono font-bold" style={{ color: app.score_run?.composite_score >= 4 ? 'var(--rc-lime)' : app.score_run?.composite_score >= 3.5 ? 'var(--rc-amber)' : 'var(--rc-red)' }}>
                    {app.score_run?.composite_score || '—'}
                  </td>
                  <td>
                    {app.score_run?.bucket && (
                      <span className={`rc-chip ${BUCKET_COLORS[app.score_run.bucket]}`}>
                        {app.score_run.bucket}
                      </span>
                    )}
                  </td>
                  <td className="rc-mono font-medium" style={{ color: 'var(--rc-fg)' }}>
                    {app.score_run?.eligible_loan_amt_inr
                      ? `₹${(app.score_run.eligible_loan_amt_inr/100000).toFixed(1)}L`
                      : app.requested_amount_inr
                      ? `₹${(app.requested_amount_inr/100000).toFixed(1)}L`
                      : '—'}
                  </td>
                  <td>
                    <span className={`rc-chip ${STATUS_CHIP[app.status] || 'man'}`}>
                      {app.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="rc-mono" style={{ color: 'var(--rc-dim)', fontSize: 12 }}>
                    {app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
