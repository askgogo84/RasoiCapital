'use client'
import { useState, useEffect } from 'react'

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  conditionally_approved: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
  disbursed: 'bg-emerald-100 text-emerald-700',
  draft: 'bg-slate-100 text-slate-500',
}

const BUCKET_COLORS: Record<string, string> = {
  G: 'badge-G', C: 'badge-C', P: 'badge-P'
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
          <h1 className="text-xl font-bold text-slate-800">Loan Applications</h1>
          <p className="text-sm text-slate-500">Review, approve and disburse</p>
        </div>
        <a href="/underwrite"
           className="px-4 py-2 rounded-lg text-white text-sm font-medium"
           style={{ background: '#0D1F3C' }}>
          + New Assessment
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {['all','submitted','under_review','approved','disbursed','rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                    filter === s
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400">Loading applications…</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-semibold text-slate-600 mb-1">No applications yet</div>
          <p className="text-sm text-slate-400">Run an underwriting assessment and submit an application to see it here.</p>
          <a href="/underwrite" className="inline-block mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
             style={{ background: '#028090' }}>
            Run Underwriting
          </a>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['App No.','Outlet','City','Score','Bucket','Amount','Status','Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => (
                <tr key={app.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{app.application_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{app.outlet?.outlet_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{app.outlet?.city || '—'}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: app.score_run?.composite_score >= 4 ? '#02C39A' : app.score_run?.composite_score >= 3.5 ? '#D97706' : '#DC2626' }}>
                    {app.score_run?.composite_score || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {app.score_run?.bucket && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BUCKET_COLORS[app.score_run.bucket]}`}>
                        {app.score_run.bucket}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {app.score_run?.eligible_loan_amt_inr
                      ? `₹${(app.score_run.eligible_loan_amt_inr/100000).toFixed(1)}L`
                      : app.requested_amount_inr
                      ? `₹${(app.requested_amount_inr/100000).toFixed(1)}L`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-500'}`}>
                      {app.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
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
