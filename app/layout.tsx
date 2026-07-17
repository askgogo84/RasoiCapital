import type { Metadata } from 'next'
import './globals.css'
import './rasoi-theme.css'
import NavBar from '../components/NavBar'

export const metadata: Metadata = {
  title: 'Rasoi Capital — AI HORECA Lending',
  description: 'AI-powered lending platform for Hotels, Restaurants & Cafes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <div className="rc-app">
          <NavBar />
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
