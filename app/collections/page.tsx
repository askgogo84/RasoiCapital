'use client'

const BUCKETS = [
  { range: '1–30 days',   cat: 'Soft',   color: 'var(--rc-cyan)',  action: 'Automated SMS/WhatsApp reminders' },
  { range: '31–90 days',  cat: 'Early',  color: 'var(--rc-amber)', action: 'Reminders + EMI restructure offer + First FSA visit' },
  { range: '91–150 days', cat: 'Hard',   color: 'var(--rc-amber)', action: '2nd FSA visit + Distributor loop + Landlord loop' },
  { range: '151–180 days',cat: 'NPA L1', color: 'var(--rc-red)',   action: 'SARFAESI Section 13(2) notice — liquidate kitchen collateral' },
  { range: '180+ days',   cat: 'NPA L2', color: 'var(--rc-red)',   action: 'PDC bounce → Section 138 NI Act — criminal case' },
]

const ACTIONS = [
  { type: 'reminder_sms',      label: 'SMS Reminder',        icon: '📱' },
  { type: 'reminder_whatsapp', label: 'WhatsApp Reminder',   icon: '💬' },
  { type: 'fsa_visit',         label: 'FSA Visit',           icon: '🚗' },
  { type: 'emi_restructure',   label: 'EMI Restructure',     icon: '🔄' },
  { type: 'distributor_loop',  label: 'Distributor Loop',    icon: '🤝' },
  { type: 'sarfaesi_notice',   label: 'SARFAESI Notice',     icon: '⚖️' },
  { type: 'pdc_bounce_notice', label: 'PDC Bounce Notice',   icon: '🔔' },
]

export default function CollectionsPage() {
  return (
    <div className="rc-page">
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: 'var(--rc-fg)' }}>Collections Engine</h1>
        <p className="rc-eyebrow" style={{ marginTop: 4 }}>DPD buckets · FSA beats · Legal notice tracking</p>
      </div>

      {/* DPD bucket overview */}
      <div className="rc-panel mb-4">
        <div className="rc-panel-title">DPD Bucket Timeline</div>
        <div className="space-y-3">
          {BUCKETS.map(b => (
            <div key={b.cat} className="flex items-start gap-4 p-3 rounded-lg" style={{ border: '1px solid var(--rc-line)' }}>
              <div className="w-24 flex-shrink-0">
                <div className="rc-mono text-xs font-bold" style={{ color: b.color }}>{b.cat}</div>
                <div className="text-xs" style={{ color: 'var(--rc-dim)', marginTop: 2 }}>{b.range}</div>
              </div>
              <div style={{ background: b.color, opacity: 0.5, minWidth: 8, maxWidth: 8, height: 8, borderRadius: 4, marginTop: 6 }}/>
              <div className="flex-1 text-sm" style={{ color: 'var(--rc-fg)' }}>{b.action}</div>
              <div className="rc-mono text-2xl font-bold w-8 text-right" style={{ color: 'var(--rc-line)' }}>0</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
        {ACTIONS.map(a => (
          <button key={a.type} className="rc-panel text-left" style={{ padding: 16, cursor: 'pointer' }}>
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="text-sm font-medium" style={{ color: 'var(--rc-fg)' }}>{a.label}</div>
            <div className="text-xs" style={{ color: 'var(--rc-dim)', marginTop: 2 }}>0 pending</div>
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="rc-panel text-center" style={{ padding: 40 }}>
        <div className="text-4xl mb-3">📞</div>
        <div className="font-semibold mb-1" style={{ color: 'var(--rc-fg)' }}>No collection activities yet</div>
        <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--rc-dim)' }}>
          Once loans are disbursed, overdue EMIs will appear here automatically.
          DPD buckets update every morning at 6:00 AM IST via cron.
        </p>
      </div>
    </div>
  )
}
