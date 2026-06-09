import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rasoi Capital — AI HORECA Lending',
  description: 'AI-powered lending platform for Hotels, Restaurants & Cafes',
}

const NAV = [
  { href: '/underwrite',    label: 'Underwrite',    icon: '🧠' },
  { href: '/applications',  label: 'Applications',  icon: '📋' },
  { href: '/loans',         label: 'Active Loans',  icon: '💰' },
  { href: '/collections',   label: 'Collections',   icon: '📞' },
  { href: '/analytics',     label: 'Analytics',     icon: '📊' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Top nav */}
        <header style={{ background: '#0D1F3C', borderBottom: '3px solid #02C39A' }}
                className="sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
            <div className="flex items-center gap-2 mr-4">
              <span className="text-2xl">🍽️</span>
              <div>
                <span className="text-white font-bold text-lg tracking-tight">Rasoi</span>
                <span style={{ color: '#02C39A' }} className="font-bold text-lg tracking-tight"> Capital</span>
              </div>
              <span className="text-xs text-slate-400 ml-2 hidden md:block">AI HORECA Lending</span>
            </div>
            <nav className="flex gap-1 overflow-x-auto">
              {NAV.map(n => (
                <a key={n.href} href={n.href}
                   className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-300
                              hover:text-white hover:bg-white/10 text-sm font-medium whitespace-nowrap
                              transition-colors">
                  <span>{n.icon}</span>
                  <span>{n.label}</span>
                </a>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full text-emerald-400"
                    style={{ background: 'rgba(2,195,154,0.15)', border: '1px solid rgba(2,195,154,0.3)' }}>
                Demo Mode
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
