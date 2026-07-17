'use client'
import { useState } from 'react'

const BUCKET_CONFIG = {
  G: { label: 'Good — Auto Approve',          cls: 'badge-G', bg: '#DCFCE7', text: '#166534' },
  C: { label: 'Consider — With Conditions',   cls: 'badge-C', bg: '#FEF9C3', text: '#854d0e' },
  P: { label: 'Pause — Manual Review',        cls: 'badge-P', bg: '#FEF2F2', text: '#991b1b' },
}

const FACTOR_LABELS: Record<string, string> = {
  margin: 'Outlet Margin (30%)', qqGrowth: 'Sales Trend (30%)',
  avgSales: 'Avg Sales Volume (20%)', location: 'Location (10%)',
  ambience: 'Ambience (5%)', cibil: 'CIBIL Score (5%)',
}

function scoreColor(s: number) {
  if (s >= 4.5) return '#02C39A'
  if (s >= 3.5) return '#16a34a'
  if (s >= 2.5) return '#D97706'
  if (s >= 1.5) return '#f97316'
  return '#DC2626'
}

export default function UnderwritePage() {
  const [form, setForm] = useState({
    outletName: '', outletType: '', city: 'Bengaluru',
    outletCategory: '', avgMonthlySalesInr: '', qqGrowthPct: '',
    locationCode: '', cibilScore: '', ambiencePos: '0', ambienceAvg: '0',
    cycleNumber: '1', loanPurpose: '', ownerExperienceYrs: '',
    leaseMonthsRemaining: '', foirLevel: '',
  })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'cm' | 'fsa'>('cm')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function runAnalysis() {
    if (!form.outletCategory || !form.avgMonthlySalesInr || !form.locationCode || !form.cibilScore) {
      setError('Fill in outlet category, sales, location, and CIBIL score to continue.')
      return
    }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/score/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const sc = result?.scoring
  const ai = result?.aiNarrative

  return (
    <div>
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">AI Underwriting Tool</h1>
          <p className="text-sm text-slate-500">6-factor credit scoring · Bucket decision · Claude risk narrative</p>
        </div>
        {result && (
          <div className="flex gap-2">
            {(['cm','fsa'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        view === v ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}>
                {v === 'cm' ? 'Credit Manager' : 'FSA Lite View'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Input Form ── */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Outlet Information
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Outlet Name</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                     placeholder="Spice Garden" value={form.outletName}
                     onChange={e => set('outletName', e.target.value)}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">City</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.city} onChange={e => set('city', e.target.value)}>
                {['Bengaluru','Mumbai','Delhi NCR','Hyderabad','Chennai','Pune'].map(c =>
                  <option key={c}>{c}</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Menu Category <span className="text-slate-400">(pricing tier)</span>
              </label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.outletCategory} onChange={e => set('outletCategory', e.target.value)}>
                <option value="">Select</option>
                <option value="A">Cat A — Premium (margin 35%)</option>
                <option value="B">Cat B — Mid-premium (32%)</option>
                <option value="C">Cat C — Mid-range (27%)</option>
                <option value="D">Cat D — Value market (24%)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Location Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.locationCode} onChange={e => set('locationCode', e.target.value)}>
                <option value="">Select</option>
                <option value="A">A — Strong captive (IT park / mall)</option>
                <option value="B">B — High street</option>
                <option value="C">C — Captive audience</option>
                <option value="D">D — Main road</option>
                <option value="E">E — Others / low footfall</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Avg Monthly Sales</label>
              <div className="relative">
                <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-6"
                       placeholder="7.5" value={form.avgMonthlySalesInr}
                       onChange={e => set('avgMonthlySalesInr', e.target.value)}/>
                <span className="absolute right-2 top-2.5 text-xs text-slate-400">₹L</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Q-Q Growth</label>
              <div className="relative">
                <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-5"
                       placeholder="12" value={form.qqGrowthPct}
                       onChange={e => set('qqGrowthPct', e.target.value)}/>
                <span className="absolute right-2 top-2.5 text-xs text-slate-400">%</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">CIBIL Score</label>
              <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                     placeholder="740" value={form.cibilScore}
                     onChange={e => set('cibilScore', e.target.value)}/>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs font-medium text-slate-600 block mb-2">
              Ambience Assessment <span className="text-slate-400">(FSA observation)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-500 mb-1">Positive factors (décor / seating / hygiene)</div>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.ambiencePos} onChange={e => set('ambiencePos', e.target.value)}>
                  <option value="0">0 positive</option>
                  <option value="1">1 positive</option>
                  <option value="2">2 positive</option>
                  <option value="3">3 positive</option>
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Average factors</div>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        value={form.ambienceAvg} onChange={e => set('ambienceAvg', e.target.value)}>
                  <option value="0">0 average</option>
                  <option value="1">1 average</option>
                  <option value="2">2 average</option>
                  <option value="3">3 average</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-4">
            Additional Risk Signals
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Loan Purpose</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.loanPurpose} onChange={e => set('loanPurpose', e.target.value)}>
                <option value="">Select</option>
                <option>Outlet refurbishment</option>
                <option>Equipment purchase</option>
                <option>Working capital</option>
                <option>Raw material</option>
                <option>Staff costs</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Loan Cycle</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.cycleNumber} onChange={e => set('cycleNumber', e.target.value)}>
                <option value="1">1st loan (cap ₹3L)</option>
                <option value="2">2nd loan (cap ₹7L)</option>
                <option value="3">3rd loan + (no cap)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Owner Experience</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.ownerExperienceYrs} onChange={e => set('ownerExperienceYrs', e.target.value)}>
                <option value="">Select</option>
                <option value="5+">5+ years</option>
                <option value="2-5">2–5 years</option>
                <option value="1-2">1–2 years</option>
                <option value="first">First-time operator</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Existing Loan (FOIR)</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={form.foirLevel} onChange={e => set('foirLevel', e.target.value)}>
                <option value="">Select</option>
                <option value="none">None</option>
                <option value="low">Low (&lt;30%)</option>
                <option value="mid">Medium (30–50%)</option>
                <option value="high">High (&gt;50%)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button onClick={runAnalysis} disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity
                             hover:opacity-90 disabled:opacity-60"
                  style={{ background: '#0D1F3C' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Running AI Assessment…
              </span>
            ) : 'Analyse & Underwrite →'}
          </button>
        </div>

        {/* ── Results ── */}
        <div>
          {!result && !loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="text-4xl mb-3">🧠</div>
              <div className="font-semibold text-slate-700 mb-1">Ready to assess</div>
              <div className="text-sm text-slate-400 max-w-xs">
                Fill in outlet details and click Analyse to run the full 6-factor AI underwriting.
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="text-4xl mb-3 animate-pulse">⚙️</div>
              <div className="font-semibold text-slate-700 mb-1">Running assessment…</div>
              <div className="text-sm text-slate-400">Scoring engine + Claude risk narrative</div>
            </div>
          )}

          {sc && view === 'cm' && (
            <div className="space-y-4">
              {/* Score card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold text-slate-800 text-base">{form.outletName || 'Outlet'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{form.outletType} · {form.city}</div>
                    <div className="mt-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${sc.bucket === 'G' ? 'badge-G' : sc.bucket === 'C' ? 'badge-C' : 'badge-P'}`}>
                        {BUCKET_CONFIG[sc.bucket as 'G'|'C'|'P'].label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold" style={{ color: scoreColor(sc.compositeScore) }}>
                      {sc.compositeScore}
                    </div>
                    <div className="text-xs text-slate-400">/ 5.0</div>
                  </div>
                </div>

                {/* Factor bars */}
                <div className="mt-4 space-y-2">
                  {Object.entries(sc.factors).map(([k, v]: any) => (
                    <div key={k} className="flex items-center gap-3">
                      <div className="text-xs text-slate-500 w-40 flex-shrink-0">{FACTOR_LABELS[k]}</div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                             style={{ width: `${(v/5)*100}%`, background: scoreColor(v) }}/>
                      </div>
                      <div className="text-xs font-semibold w-8 text-right" style={{ color: scoreColor(v) }}>
                        {v}/5
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Loan terms */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Loan Terms
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { l: 'Loan Amount',    v: `₹${(sc.loanTerms.finalLoanAmtInr/100000).toFixed(2)}L` },
                    { l: 'Disbursement',   v: `₹${(sc.loanTerms.disbursementInr/100000).toFixed(2)}L` },
                    { l: 'Interest Rate',  v: `${sc.loanTerms.interestRatePct}% p.a.` },
                    { l: 'Tenure',         v: `${sc.loanTerms.tenureMonths} months` },
                    { l: 'Daily EMI',      v: `₹${sc.loanTerms.dailyEmiInr.toLocaleString()}` },
                    { l: 'Processing Fee', v: `${sc.loanTerms.processingFeePct}%` },
                    { l: 'Collateral',     v: sc.loanTerms.collateralRequired ? 'Required' : 'Not required' },
                    { l: 'Outlet Margin',  v: `${sc.marginPct}%` },
                  ].map(item => (
                    <div key={item.l} className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-navy" style={{ color: '#0D1F3C' }}>{item.v}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Narrative */}
              {ai && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    AI Risk Assessment
                  </div>
                  {ai.narrative && (
                    <div className="rounded-lg border-l-4 border-indigo-400 bg-indigo-50 p-3">
                      <div className="text-xs font-bold text-indigo-700 mb-1">Credit Narrative</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{ai.narrative}</p>
                    </div>
                  )}
                  {ai.weakFactors && (
                    <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-3">
                      <div className="text-xs font-bold text-red-700 mb-1">Weak Factors</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{ai.weakFactors}</p>
                    </div>
                  )}
                  {ai.improvementPath && (
                    <div className="rounded-lg border-l-4 border-emerald-400 bg-emerald-50 p-3">
                      <div className="text-xs font-bold text-emerald-700 mb-1">Improvement Path</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{ai.improvementPath}</p>
                    </div>
                  )}
                  {ai.competitorContext && (
                    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
                      <div className="text-xs font-bold text-amber-700 mb-1">vs Competitors</div>
                      <p className="text-sm text-slate-700 leading-relaxed">{ai.competitorContext}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* FSA Lite View */}
          {sc && view === 'fsa' && (
            <div className="space-y-4">
              <div className={`rounded-xl border-2 p-6 text-center`}
                   style={{
                     background: sc.bucket === 'G' ? '#DCFCE7' : sc.bucket === 'C' ? '#FEF9C3' : '#FEF2F2',
                     borderColor: sc.bucket === 'G' ? '#16a34a' : sc.bucket === 'C' ? '#ca8a04' : '#dc2626',
                   }}>
                <div className="text-4xl mb-2">
                  {sc.bucket === 'G' ? '✅' : sc.bucket === 'C' ? '⚠️' : '❌'}
                </div>
                <div className="text-xl font-bold mb-1"
                     style={{ color: sc.bucket === 'G' ? '#166534' : sc.bucket === 'C' ? '#854d0e' : '#991b1b' }}>
                  {sc.bucket === 'G' ? 'Approved' : sc.bucket === 'C' ? 'Conditional Approval' : 'Does Not Qualify'}
                </div>
                <div className="text-sm" style={{ color: sc.bucket === 'G' ? '#166534' : sc.bucket === 'C' ? '#854d0e' : '#991b1b' }}>
                  Score: {sc.compositeScore}/5.0
                </div>
                {sc.bucket !== 'P' && (
                  <div className="flex justify-center gap-6 mt-4">
                    <div><div className="text-2xl font-bold text-slate-800">₹{(sc.loanTerms.finalLoanAmtInr/100000).toFixed(1)}L</div><div className="text-xs text-slate-500">Loan</div></div>
                    <div><div className="text-2xl font-bold text-slate-800">{sc.loanTerms.interestRatePct}%</div><div className="text-xs text-slate-500">Rate</div></div>
                    <div><div className="text-2xl font-bold text-slate-800">{sc.loanTerms.tenureMonths}M</div><div className="text-xs text-slate-500">Tenure</div></div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Tell the borrower:
                </div>
                {sc.bucket === 'G' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm bg-slate-50 rounded-lg p-3"><span>✅</span><span>Loan of ₹{(sc.loanTerms.finalLoanAmtInr/100000).toFixed(1)}L approved at {sc.loanTerms.interestRatePct}% interest. Disbursement within 1 hour of docs.</span></div>
                    <div className="flex gap-2 text-sm bg-slate-50 rounded-lg p-3"><span>📅</span><span>Daily EMI: ₹{sc.loanTerms.dailyEmiInr}. Pre-pay on good days, skip on slow days.</span></div>
                    <div className="flex gap-2 text-sm bg-slate-50 rounded-lg p-3"><span>🎮</span><span>Good repayment unlocks higher loan cap and better rate next cycle.</span></div>
                  </div>
                )}
                {sc.bucket === 'C' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm bg-slate-50 rounded-lg p-3"><span>⚠️</span><span>Approved with conditions. ₹{(sc.loanTerms.finalLoanAmtInr/100000).toFixed(1)}L at {sc.loanTerms.interestRatePct}% — slightly higher rate due to risk profile.</span></div>
                    <div className="flex gap-2 text-sm bg-slate-50 rounded-lg p-3"><span>🏠</span><span>Collateral required: kitchen equipment + security deposit hypothecation.</span></div>
                    <div className="flex gap-2 text-sm bg-amber-50 rounded-lg p-3"><span>📄</span><span>PDC cheques + credit shield insurance mandatory.</span></div>
                  </div>
                )}
                {sc.bucket === 'P' && (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm bg-red-50 rounded-lg p-3"><span>❌</span><span>Does not meet minimum criteria right now. Score below 3.0.</span></div>
                    <div className="flex gap-2 text-sm bg-slate-50 rounded-lg p-3"><span>💡</span><span>Working capital loan (RM / salary / rent) may still be possible — refer to credit manager.</span></div>
                    <div className="flex gap-2 text-sm bg-slate-50 rounded-lg p-3"><span>📈</span><span>Re-apply in 3 months with documented sales improvement.</span></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
