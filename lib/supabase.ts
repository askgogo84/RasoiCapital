import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (components)
export function createClient() {
  return createBrowserClient(url, anon)
}

// Server client (API routes, server components)
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value },
      set(name: string, value: string, options: Record<string, unknown>) {
        try { (cookieStore as any).set({ name, value, ...options }) } catch {}
      },
      remove(name: string, options: Record<string, unknown>) {
        try { (cookieStore as any).set({ name, value: '', ...options }) } catch {}
      },
    },
  })
}

// Admin client — bypasses RLS (server-side only)
export function createAdminClient() {
  const { createClient: createSB } = require('@supabase/supabase-js')
  return createSB(url, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
