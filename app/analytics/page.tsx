'use client'

const SCORE_DIST = [
  { range: '4.5–5.0', bucket: 'G', count: 0, pct: 0, color: 'var(--rc-lime)' },
  { range: '4.0–4.5', bucket: 'G', count: 0, pct: 0, color: 'var(--rc-lime)' },
  { range: '3.5–4.0', bucket: 'C', count: 0, pct: 0, color: 'var(--rc-amber)' },
  { range: '3.0–3.5', bucket: 'P', count: 0, pct: 0, color: 'var(--rc-amber)' },
  { range: '< 3.0',   bucket: 'P', count: 0, pct: 0, color: 'var(--rc-red)' },
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
        <h1 className="text-xl font-bold" style={{ color: 'var(--rc-fg)' }}>Portfolio Analytics</h1>
        <p className="rc-eyebrow" style={{ marginTop: 4 }}>Real-time portfolio health · Scoring distribution · Cron status</p>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: 'Total AUM',       v: '₹0',  sub: 'No loans yet',       c: 'var(--rc-fg)' },
          { l: 'Collection Rate', v: '—',   sub: 'Repayment rate',      c: 'var(--rc-lime)' },
          { l: 'NPA Rate',        v: '—',   sub: 'Industry avg 1.5%',   c: 'var(--rc-red)' },
          { l: 'Score Runs',      v: '0',   sub: 'Total underwritten',  c: 'var(--rc-cyan)' },
        ].map(s => (
          <div key={s.l} className="rc-panel" style={{ padding: 16 }}>
            <div className="rc-mono text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--rc-fg)', marginTop: 4 }}>{s.l}</div>
            <div className="text-xs" style={{ color: 'var(--rc-dim)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        {/* Score distribution */}
        <div className="rc-panel">
          <div className="rc-panel-title">Score Distribution</div>
          {SCORE_DIST.map(s => (
            <div key={s.range} className="flex items-center gap-3 mb-3">
              <div className="rc-mono w-16 text-xs flex-shrink-0" style={{ color: 'var(--rc-dim)' }}>{s.range}</div>
              <span className={`rc-chip ${s.bucket === 'G' ? 'current' : s.bucket === 'C' ? 'soft' : 'hard'}`} style={{ width: 28, textAlign: 'center' }}>{s.bucket}</span>
              <div className="rc-track flex-1">
                <div className="rc-fill" style={{ width: `${s.pct}%`, background: s.color }}/>
              </div>
              <div className="rc-mono text-xs w-8 text-right" style={{ color: 'var(--rc-dim)' }}>{s.count}</div>
            </div>
          ))}
          <div className="text-xs text-center mt-3" style={{ color: 'var(--rc-dim)' }}>No scoring data yet</div>
        </div>

        {/* RL model readiness */}
        <div className="rc-panel">
          <div className="rc-panel-title">RL Model Readiness — Phase 2</div>
          <div className="space-y-3">
            {[
              { l: 'Labelled loan outcomes', v: 0, target: 300, desc: '300 needed to train RL model' },
              { l: 'Good outcomes',          v: 0, target: 200, desc: 'Completed loans with full repayment' },
              { l: 'NPA outcomes',           v: 0, target: 30,  desc: 'Defaulted loans labelled' },
              { l: 'Months of data',         v: 0, target: 6,   desc: '6 months min before training' },
            ].map(item => (
              <div key={item.l}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium" style={{ color: 'var(--rc-fg)' }}>{item.l}</span>
                  <span className="rc-mono" style={{ color: 'var(--rc-dim)' }}>{item.v}/{item.target}</span>
                </div>
                <div className="rc-track">
                  <div className="rc-fill" style={{ width: `${Math.min(100, (item.v/item.target)*100)}%` }}/>
                </div>
                <div className="text-xs" style={{ color: 'var(--rc-dim)', marginTop: 2 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--rc-panel2)', border: '1px solid var(--rc-line)' }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--rc-cyan)' }}>Phase 2 starts Month 9</div>
            <div className="text-xs" style={{ color: 'var(--rc-dim)', marginTop: 2 }}>
              Currently collecting training data. RL model will predict default at intake form stage.
            </div>
          </div>
        </div>
      </div>

      {/* Cron job status */}
      <div className="rc-panel">
        <div className="rc-panel-title">Scheduled Jobs — IST Daily</div>
        <div className="space-y-2">
          {CRONS.map(c => (
            <div key={c.job} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--rc-panel2)' }}>
              <div className="rc-mono text-xs w-20 flex-shrink-0" style={{ color: 'var(--rc-amber)' }}>{c.time}</div>
              <div className="rc-mono text-xs w-36 flex-shrink-0" style={{ color: 'var(--rc-cyan)' }}>{c.job}</div>
              <div className="text-sm flex-1" style={{ color: 'var(--rc-fg)' }}>{c.desc}</div>
              <span className="rc-chip man">not configured</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'var(--rc-panel2)', border: '1px solid var(--rc-amber)', color: 'var(--rc-amber)' }}>
          Register these crons at <strong>cron-job.org</strong> with header <code className="rc-mono" style={{ background: 'var(--rc-panel)', padding: '1px 4px', borderRadius: 3 }}>x-cron-secret: RasoiCapital-cron-2026</code>
        </div>
      </div>
    </div>
  )
}
