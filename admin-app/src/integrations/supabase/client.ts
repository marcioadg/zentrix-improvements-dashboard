import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "https://bprlchkedecbyoaqlbfz.supabase.co").trim()
export const SUPABASE_PUBLISHABLE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcmxjaGtlZGVjYnlvYXFsYmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzI3MzMsImV4cCI6MjA4OTgwODczM30.YxCTWVRqmi-qFKR-w95EscQ5_dpJK5QZXSQHFT1CQ7c").trim()

// Insights data lives in the 'insights' schema on the same Supabase project.
//
// IMPORTANT: this client must NOT manage its own auth session. Without these
// auth options it defaults to persisting + refreshing a session against the
// same localStorage key as the main `supabase` client below, so two
// GoTrueClient instances end up racing over the same storage. Chrome and
// Firefox tolerate it; Safari (with its stricter storage serialization +
// ITP) sometimes deadlocks, and the user's session check hangs forever —
// observed as "infinite loading" on /dashboard for Safari users. The main
// `supabase` client below is the sole auth manager; PostgREST requests from
// this client still carry the JWT because the main client sets it on the
// shared dataClient export.
export const insightsClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'insights' },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

export const authClient = supabase
export const dataClient = supabase
