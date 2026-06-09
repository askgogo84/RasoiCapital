'use client'

const SCORE_DIST = [
  { range: '4.5–5.0', bucket: 'G', count: 0, pct: 0, color: '#02C39A' },
  { range: '4.0–4.5', bucket: 'G', count: 0, pct: 0, color: '#16a34a' },
  { range: '3.5–4.0', bucket: 'C', count: 0, pct: 0, color: '#D97706' },
  { range: '3.0–3.5', bucket: 'P', count: 0, pct: 0, color: '#f97316' },
  { range: '< 3.0',   bucket: 'P', count: 0, pct: 0, color: '#DC2626' },
]

const CRONS = [
  { time: '06:00 AM', job: 'update-dpd',         status: 'pending', desc: 'DPD bucket reclassification' },
  { time: '07:00 AM', job: 'emi-reminders',       status: 'pending', desc: 'Pre-due EMI reminders (D-3, D-1)' },
  { time: '08:30 AM', job: 'assign-beats',        status: 'pending', desc: 'FSA beat assignment' },
  { time: '09:00 AM', job: 'escalate-overdue',    status: 'pending', desc: 'DPD escalation actions' },
  { time: '11:00 AM', job: 'award-points',        status: 'pending', desc: 'Gamification points for on-time payments' },
  { time: '02:00 PM', job: 'portfolio-snapshot',  status: 'pending', desc: 'Daily analytics aggregation' },
]

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">Portfolio Analytics</h1>
        <p className="text-sm text-slate-500">Real-time portfolio health · Scoring distribution · Cron status</p>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Total AUM',       v: '₹0',  sub: 'No loans yet',       c: '#0D1F3C' },
          { l: 'Collection Rate', v: '—',   sub: 'Repayment rate',      c: '#02C39A' },
          { l: 'NPA Rate',        v: '—',   sub: 'Industry avg 1.5%',   c: '#DC2626' },
          { l: 'Score Runs',      v: '0',   sub: 'Total underwritten',  c: '#4F46E5' },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
            <div className="text-sm font-medium text-slate-700 mt-0.5">{s.l}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Score distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Score Distribution
          </div>
          {SCORE_DIST.map(s => (
            <div key={s.range} className="flex items-center gap-3 mb-3">
              <div className="w-16 text-xs text-slate-500 flex-shrink-0">{s.range}</div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded w-7 text-center flex-shrink-0 ${
                s.bucket === 'G' ? 'badge-G' : s.bucket === 'C' ? 'badge-C' : 'badge-P'
              }`}>{s.bucket}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }}/>
              </div>
              <div className="text-xs text-slate-400 w-8 text-right">{s.count}</div>
            </div>
          ))}
          <div className="text-xs text-slate-400 text-center mt-3">No scoring data yet</div>
        </div>

        {/* RL model readiness */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            RL Model Readiness — Phase 2
          </div>
          <div className="space-y-3">
            {[
              { l: 'Labelled loan outcomes', v: 0, target: 300, desc: '300 needed to train RL model' },
              { l: 'Good outcomes',          v: 0, target: 200, desc: 'Completed loans with full repayment' },
              { l: 'NPA outcomes',           v: 0, target: 30,  desc: 'Defaulted loans labelled' },
              { l: 'Months of data',         v: 0, target: 6,   desc: '6 months min before training' },
            ].map(item => (
              <div key={item.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{item.l}</span>
                  <span className="text-slate-400">{item.v}/{item.target}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-400"
                       style={{ width: `${Math.min(100, (item.v/item.target)*100)}%` }}/>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
            <div className="text-xs font-semibold text-indigo-700">Phase 2 starts Month 9</div>
            <div className="text-xs text-indigo-600 mt-0.5">
              Currently collecting training data. RL model will predict default at intake form stage.
            </div>
          </div>
        </div>
      </div>

      {/* Cron job status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Scheduled Jobs — IST Daily
        </div>
        <div className="space-y-2">
          {CRONS.map(c => (
            <div key={c.job} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
              <div className="font-mono text-xs text-amber-600 w-20 flex-shrink-0">{c.time}</div>
              <div className="font-mono text-xs text-indigo-600 w-36 flex-shrink-0">{c.job}</div>
              <div className="text-sm text-slate-600 flex-1">{c.desc}</div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
                not configured
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Register these crons at <strong>cron-job.org</strong> with header <code className="bg-amber-100 px-1 rounded">x-cron-secret: RasoiCapital-cron-2026</code>
        </div>
      </div>
    </div>
  )
}
