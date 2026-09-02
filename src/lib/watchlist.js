/**
 * watchlist.js — the Phase 1 version of "notify me when a policy changes".
 *
 * Deliberately local-only: no account, no email, no backend. It stores which
 * tools you care about in this browser and flags rows whose data is stale or
 * unverified. A real alerting tier needs an email address and a cron job; this
 * needs neither and still tells you the useful thing ("this row is 214 days
 * old, treat it as unconfirmed").
 *
 * NOTE: 'stale' here is the watchdog concept, not the FieldState component
 * state (dropped eb76712). Reconcile at Phase 5.
 */

const KEY = 'wt.watchlist.v1'

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function getWatchlist() {
  if (typeof localStorage === 'undefined') return []
  return safeParse(localStorage.getItem(KEY) ?? '[]')
}

export function isWatched(id) {
  return getWatchlist().includes(id)
}

export function toggleWatch(id) {
  if (typeof localStorage === 'undefined') return []
  const current = getWatchlist()
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

/** Days since a row was last verified. null → never verified. */
export function daysSince(dateString) {
  if (!dateString) return null
  const then = new Date(`${dateString}T00:00:00Z`).getTime()
  if (Number.isNaN(then)) return null
  return Math.floor((Date.now() - then) / 86_400_000)
}

/** How trustworthy a row is right now, in one word. */
export function freshness(tool) {
  const days = daysSince(tool.verification.last_verified)
  if (tool.verification.status !== 'verified') return { label: 'Unverified', tone: 'unknown', days: null }
  if (days === null) return { label: 'Unverified', tone: 'unknown', days: null }
  if (days > 120) return { label: `${days} days old`, tone: 'bad', days }
  if (days > 60) return { label: `${days} days old`, tone: 'mixed', days }
  return { label: `${days} days old`, tone: 'good', days }
}
