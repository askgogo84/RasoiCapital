'use client'
import { useState, useEffect } from 'react'

const DPD_CHIP: Record<string, string> = {
  current: 'current',
  soft:    'soft',
  early:   'early',
  hard:    'hard',
  npa_l1:  'npa_l1',
  npa_l2:  'npa_l2',
}

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    // Fetch from Supabase directly via API
    fetch(`/api/loans?status=${filter}`)
      .then(r => r.json())
      .then(d => { setLoans(d.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [filter])

  const totalAUM = loans.reduce((s, l) => s + (l.outstanding_principal || 0), 0)
  const avgDPD   = loans.length ? Math.round(loans.reduce((s,l) => s + (l.current_dpd||0), 0) / loans.length) : 0
  const npaCount = loans.filter(l => l.status === 'npa').length

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--rc-fg)' }}>Active Loans</h1>
        <p className="rc-eyebrow" style={{ marginTop: 4 }}>Portfolio tracker · DPD · EMI status</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Total AUM',     v: `₹${(totalAUM/100000).toFixed(1)}L`, c: 'var(--rc-fg)' },
          { l: 'Active Loans',  v: loans.filter(l=>l.status==='active').length, c: 'var(--rc-cyan)' },
          { l: 'Avg DPD',       v: `${avgDPD} days`, c: 'var(--rc-amber)' },
          { l: 'NPA Count',     v: npaCount, c: 'var(--rc-red)' },
        ].map(s => (
          <div key={s.l} className="rc-panel" style={{ padding: 16 }}>
            <div className="rc-mono text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
            <div className="rc-eyebrow" style={{ marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['active','completed','npa'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  className={filter === s ? 'rc-btn' : 'rc-btn rc-btn-ghost'}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>
            {s}
          </button>
        ))}
      </div>

      {!loading && loans.length === 0 && (
        <div className="rc-panel text-center" style={{ padding: 48 }}>
          <div className="text-4xl mb-3">💰</div>
          <div className="font-semibold mb-1" style={{ color: 'var(--rc-fg)' }}>No loans disbursed yet</div>
          <p className="text-sm" style={{ color: 'var(--rc-dim)' }}>Approve and disburse an application to see active loans here.</p>
        </div>
      )}

      {!loading && loans.length > 0 && (
        <div className="rc-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="rc-table">
            <thead>
              <tr>
                {['Loan No.','Outlet','Principal','Rate','DPD','Bucket','EMI','Status'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="rc-mono" style={{ color: 'var(--rc-cyan)', fontSize: 12 }}>{loan.loan_number}</td>
                  <td className="font-medium" style={{ color: 'var(--rc-fg)' }}>{loan.outlet?.outlet_name || '—'}</td>
                  <td className="rc-mono" style={{ color: 'var(--rc-fg)' }}>₹{(loan.outstanding_principal/100000).toFixed(1)}L</td>
                  <td className="rc-mono font-medium" style={{ color: 'var(--rc-cyan)' }}>{loan.interest_rate_pct}%</td>
                  <td>
                    <span className="rc-mono font-bold" style={{ color: loan.current_dpd > 0 ? 'var(--rc-red)' : 'var(--rc-lime)' }}>
                      {loan.current_dpd || 0}d
                    </span>
                  </td>
                  <td>
                    <span className={`rc-chip ${DPD_CHIP[loan.dpd_bucket] || 'current'}`}>
                      {loan.dpd_bucket?.replace('_',' ') || 'current'}
                    </span>
                  </td>
                  <td className="rc-mono" style={{ color: 'var(--rc-dim)' }}>₹{loan.daily_emi_inr?.toLocaleString()}/day</td>
                  <td>
                    <span className={`rc-chip ${loan.status==='active'?'current':loan.status==='npa'?'hard':'man'}`}>
                      {loan.status}
                    </span>
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
