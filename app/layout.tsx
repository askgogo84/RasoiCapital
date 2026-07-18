import type { Metadata } from 'next'
import './globals.css'
import './rasoi-theme.css'
import Sidebar from '../components/Sidebar'

export const metadata: Metadata = {
  title: 'Rasoi Capital — AI HORECA Lending',
  description: 'AI-powered lending platform for Hotels, Restaurants & Cafes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <div className="rc-app">
          <div className="rc-shell">
            <Sidebar />
            <main className="rc-main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
