/**
 * votes.js — the community signal, kept apart from the transparency score.
 *
 * These constants are decided by the founder, not picked by whoever wrote the
 * code, and they mirror the values enforced in
 * supabase/migrations/0002_voting.sql. If you change one, change both — the UI
 * and the database must never disagree about what counts.
 */

import { supabase } from './supabase.js'

const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

export const VOTE_MIN_ACCOUNT_AGE_DAYS = 14
export const VOTE_DECAY_PER_DAY = 0.1
export const VOTE_TTL_DAYS = 90

export const CAPTCHA_SITEKEY = env.VITE_HCAPTCHA_SITEKEY ?? ''
export const captchaEnabled = Boolean(CAPTCHA_SITEKEY)

/** Postgres weeks start on Monday; this must match week_start in the database. */
export function currentWeekStart() {
  const now = new Date()
  const day = (now.getUTCDay() + 6) % 7
  now.setUTCDate(now.getUTCDate() - day)
  return now.toISOString().slice(0, 10)
}

const EMPTY_SUMMARY = { upvoteScore: 0, up: 0, down: 0, total: 0 }

export async function fetchVoteSummary() {
  if (!supabase) return {}
  const { data, error } = await supabase.rpc('directory_vote_summary')
  if (error || !data) return {}
  return Object.fromEntries(
    data.map((row) => [
      row.listing_id,
      {
        upvoteScore: Number(row.upvote_score ?? 0),
        up: Number(row.up ?? 0),
        down: Number(row.down ?? 0),
        total: Number(row.total ?? 0),
      },
    ])
  )
}

export async function fetchMyVotes(userId) {
  if (!supabase || !userId) return {}
  const { data, error } = await supabase.from('votes').select('listing_id, value').eq('voter_id', userId)
  if (error || !data) return {}
  return Object.fromEntries(data.map((v) => [v.listing_id, v.value]))
}

export async function fetchCampaignsThisWeek() {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('campaigns')
    .select('listing_id, note, week_start')
    .eq('week_start', currentWeekStart())
  if (error || !data) return {}
  return Object.fromEntries(data.map((c) => [c.listing_id, c]))
}

/**
 * Votes are written through the cast-vote Edge Function, never straight to the
 * table: the captcha secret cannot live in the browser, and a client-side age
 * check would be a suggestion rather than a rule.
 */
export async function castVote({ listingId, value, captchaToken }) {
  if (!supabase) return { error: 'Voting is not configured.' }
  const { data, error } = await supabase.functions.invoke('cast-vote', {
    body: { listingId, value, captchaToken },
  })
  if (error) return { error: error.message }
  if (data?.error) return { error: data.error }
  return { data }
}

export async function startCampaign({ listingId, note }) {
  if (!supabase) return { error: 'Not configured.' }
  const { error } = await supabase.from('campaigns').insert({ listing_id: listingId, note: note || null })
  if (error) {
    // One campaign per submitter per week is a unique index; say so plainly
    // rather than surfacing a database error.
    if (/duplicate key|unique/i.test(error.message)) {
      return { error: 'You have already run a promotion campaign this week. One per submitter per week.' }
    }
    return { error: error.message }
  }
  return { ok: true }
}

export function formatUpvoteScore(n) {
  const v = Number(n ?? 0)
  return `${v > 0 ? '+' : ''}${v.toFixed(1)}`
}

export { EMPTY_SUMMARY }
