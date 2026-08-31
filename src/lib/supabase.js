/**
 * supabase.js — the only place the app touches the network for Phase 2 data.
 *
 * Two rules encoded here:
 *
 * 1. GRACEFUL DEGRADATION. With no env vars the app still builds, renders and
 *    passes every check; the directory shows a "not configured" state instead of
 *    crashing. That matters because CI runs without secrets, and because a fresh
 *    clone should work before anyone provisions a project.
 *
 * 2. ONE-WAY DATA FLOW. The Phase 1 provider dataset (src/data/tools.js) is
 *    imported statically and never read from this database. A directory listing
 *    may *display* a link to a Phase 1 tool row, but nothing in the provider
 *    database is ever derived from, or influenced by, user-submitted data.
 *    Transparency scores stay computed in code from tracked fields.
 */

import { createClient } from '@supabase/supabase-js'

// import.meta.env is Vite-only; the SSR render check runs under plain esbuild.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

export const supabase = isConfigured ? createClient(url, anonKey) : null

export const SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL || 'support@example.org'

/** Every data access goes through this so failures surface as state, not crashes. */
export async function safeQuery(fn, fallback = null) {
  if (!supabase) return { data: fallback, error: { message: 'Supabase is not configured' }, offline: true }
  try {
    return await fn(supabase)
  } catch (err) {
    return { data: fallback, error: { message: err?.message ?? 'Request failed' }, offline: false }
  }
}
