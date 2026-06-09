'use client'
import { useState, useEffect } from 'react'

const DPD_COLORS: Record<string, string> = {
  current: 'bg-green-100 text-green-700',
  soft:    'bg-blue-100 text-blue-700',
  early:   'bg-amber-100 text-amber-700',
  hard:    'bg-orange-100 text-orange-700',
  npa_l1:  'bg-red-100 text-red-700',
  npa_l2:  'bg-red-200 text-red-900',
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
        <h1 className="text-xl font-bold text-slate-800">Active Loans</h1>
        <p className="text-sm text-slate-500">Portfolio tracker · DPD · EMI status</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Total AUM',     v: `₹${(totalAUM/100000).toFixed(1)}L`, c: '#0D1F3C' },
          { l: 'Active Loans',  v: loans.filter(l=>l.status==='active').length, c: '#028090' },
          { l: 'Avg DPD',       v: `${avgDPD} days`, c: '#D97706' },
          { l: 'NPA Count',     v: npaCount, c: '#DC2626' },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['active','completed','npa'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    filter === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'
                  }`}>
            {s}
          </button>
        ))}
      </div>

      {!loading && loans.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">💰</div>
          <div className="font-semibold text-slate-600 mb-1">No loans disbursed yet</div>
          <p className="text-sm text-slate-400">Approve and disburse an application to see active loans here.</p>
        </div>
      )}

      {!loading && loans.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {['Loan No.','Outlet','Principal','Rate','DPD','Bucket','EMI','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, i) => (
                <tr key={loan.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i%2===0?'':'bg-slate-50/30'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600">{loan.loan_number}</td>
                  <td className="px-4 py-3 font-medium">{loan.outlet?.outlet_name || '—'}</td>
                  <td className="px-4 py-3">₹{(loan.outstanding_principal/100000).toFixed(1)}L</td>
                  <td className="px-4 py-3 font-medium" style={{ color: '#028090' }}>{loan.interest_rate_pct}%</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${loan.current_dpd > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {loan.current_dpd || 0}d
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DPD_COLORS[loan.dpd_bucket] || 'bg-slate-100 text-slate-500'}`}>
                      {loan.dpd_bucket?.replace('_',' ') || 'current'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">₹{loan.daily_emi_inr?.toLocaleString()}/day</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${loan.status==='active'?'bg-green-100 text-green-700':loan.status==='npa'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-500'}`}>
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
