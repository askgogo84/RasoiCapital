'use client'

const BUCKETS = [
  { range: '1–30 days',   cat: 'Soft',   color: '#3B82F6', action: 'Automated SMS/WhatsApp reminders' },
  { range: '31–90 days',  cat: 'Early',  color: '#D97706', action: 'Reminders + EMI restructure offer + First FSA visit' },
  { range: '91–150 days', cat: 'Hard',   color: '#F97316', action: '2nd FSA visit + Distributor loop + Landlord loop' },
  { range: '151–180 days',cat: 'NPA L1', color: '#DC2626', action: 'SARFAESI Section 13(2) notice — liquidate kitchen collateral' },
  { range: '180+ days',   cat: 'NPA L2', color: '#7F1D1D', action: 'PDC bounce → Section 138 NI Act — criminal case' },
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
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">Collections Engine</h1>
        <p className="text-sm text-slate-500">DPD buckets · FSA beats · Legal notice tracking</p>
      </div>

      {/* DPD bucket overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          DPD Bucket Timeline
        </div>
        <div className="space-y-3">
          {BUCKETS.map(b => (
            <div key={b.cat} className="flex items-start gap-4 p-3 rounded-lg border border-slate-100">
              <div className="w-24 flex-shrink-0">
                <div className="text-xs font-bold" style={{ color: b.color }}>{b.cat}</div>
                <div className="text-xs text-slate-400 mt-0.5">{b.range}</div>
              </div>
              <div className="flex-1 h-2 rounded-full mt-2 flex-shrink-0 w-2"
                   style={{ background: b.color, opacity: 0.2, minWidth: 8, maxWidth: 8, height: 8, borderRadius: 4, marginTop: 6 }}/>
              <div className="flex-1 text-sm text-slate-600">{b.action}</div>
              <div className="text-2xl font-bold text-slate-300 w-8 text-right">0</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
        {ACTIONS.map(a => (
          <button key={a.type}
                  className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-slate-300 transition-colors">
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="text-sm font-medium text-slate-700">{a.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">0 pending</div>
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <div className="text-4xl mb-3">📞</div>
        <div className="font-semibold text-slate-600 mb-1">No collection activities yet</div>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Once loans are disbursed, overdue EMIs will appear here automatically.
          DPD buckets update every morning at 6:00 AM IST via cron.
        </p>
      </div>
    </div>
  )
}
