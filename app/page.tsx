import Link from 'next/link'

const STATS = [
  { label: 'Active Loans',    value: '0',    sub: 'AUM ₹0',        color: '#0D1F3C' },
  { label: 'Applications',    value: '0',    sub: '0 pending review', color: '#028090' },
  { label: 'Collection Rate', value: '—',    sub: 'No data yet',    color: '#02C39A' },
  { label: 'NPA Rate',        value: '—',    sub: 'No defaults yet', color: '#4F46E5' },
]

const MODULES = [
  {
    href: '/underwrite', icon: '🧠', title: 'AI Underwriting Tool',
    desc: 'Run 6-factor credit scoring for any HORECA outlet. Get instant bucket decision, loan terms, and Claude-powered risk narrative.',
    cta: 'Run Assessment', color: '#0D1F3C',
  },
  {
    href: '/applications', icon: '📋', title: 'Application Queue',
    desc: 'Review, approve, and disburse loan applications. Full scoring breakdown, document vault, and credit manager workflow.',
    cta: 'View Queue', color: '#028090',
  },
  {
    href: '/loans', icon: '💰', title: 'Active Loans',
    desc: 'Track every live loan — outstanding principal, DPD, EMI schedule, pre-pay/skip status, and borrower 360° view.',
    cta: 'View Loans', color: '#02C39A',
  },
  {
    href: '/collections', icon: '📞', title: 'Collections Engine',
    desc: 'DPD bucket dashboard, FSA beat assignments, collection activity log, EMI restructure workflow, and legal notice tracking.',
    cta: 'Collections Dashboard', color: '#D97706',
  },
  {
    href: '/analytics', icon: '📊', title: 'Portfolio Analytics',
    desc: 'Real-time portfolio health — AUM, NPA rate, city breakdown, scoring distribution, and RL training data readiness.',
    cta: 'View Analytics', color: '#4F46E5',
  },
]

export default function HomePage() {
  return (
    <div className="rc-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Rasoi Capital — Operations Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          AI-powered lending for HORECA · Bengaluru Pilot
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATS.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-sm font-medium text-slate-700 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(m => (
          <div key={m.href}
               className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col
                          hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                   style={{ background: m.color + '18' }}>
                {m.icon}
              </div>
              <h2 className="font-semibold text-slate-800">{m.title}</h2>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed flex-1">{m.desc}</p>
            <Link href={m.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium
                             px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                  style={{ background: m.color }}>
              {m.cta} →
            </Link>
          </div>
        ))}
      </div>

      {/* Setup reminder */}
      <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">⚙️</span>
          <div>
            <div className="font-semibold text-amber-900 text-sm">Setup Required</div>
            <div className="text-amber-800 text-sm mt-1">
              Add your Supabase and Anthropic API keys to <code className="bg-amber-100 px-1 rounded">.env.local</code> to
              activate live database and AI features. See the setup guide below.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
