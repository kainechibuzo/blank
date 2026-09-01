/**
 * listings.js — submitting, editing and re-verifying a directory entry.
 *
 * EDIT_WINDOW_HOURS is mirrored in supabase/migrations/0003 and cross-checked
 * by the traceability check, so the sentence shown to a submitter cannot
 * disagree with the policy the database enforces.
 */

import { supabase } from './supabase.js'
import { describeEdgeFailure } from './edge.js'

export const EDIT_WINDOW_HOURS = 24

export function editWindowOpen(listing) {
  if (!listing?.editable_until) return false
  return new Date(listing.editable_until).getTime() > Date.now()
}

/** "23 hours left" / "about 4 hours left" / "under an hour left". */
export function editWindowRemaining(listing) {
  const ms = new Date(listing?.editable_until ?? 0).getTime() - Date.now()
  if (ms <= 0) return null
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `under ${Math.max(1, minutes)} minute${minutes === 1 ? '' : 's'} left`
  const hours = Math.round(ms / 3600000)
  return `${hours} hour${hours === 1 ? '' : 's'} left`
}

/** Fields a submitter may correct, and nothing else. */
const EDITABLE = ['name', 'url', 'category', 'blurb', 'claimed_description']

export async function updateListing(id, patch) {
  if (!supabase) return { error: 'Not configured.' }

  const changes = {}
  for (const key of EDITABLE) if (patch[key] !== undefined) changes[key] = patch[key] || null
  if (changes.url && !changes.url.startsWith('http')) changes.url = `https://${changes.url}`

  const { data, error } = await supabase
    .from('listings')
    .update({ ...changes, last_edited_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // The policy is time-boxed, so a stale tab gets the honest answer.
    if (/row-level security|policy/i.test(error.message)) {
      return { error: 'The 24-hour editing window has closed.' }
    }
    return { error: error.message }
  }
  return { data }
}

/**
 * Re-run the ownership check. Deliberately available after the edit window has
 * closed: verification is not a one-shot favour granted at submission, and a
 * submitter who left the page mid-setup should not be stuck.
 */
export async function requestVerification(listingId) {
  if (!supabase) return { error: 'Not configured.' }
  const { data, error, response } = await supabase.functions.invoke('verify-snippet', {
    body: { listingId },
  })
  if (error) {
    // Classify by error class and HTTP status, never by the wording of the
    // reply. A 404 saying "Listing not found, or not yours" used to be reported
    // as "the function is not deployed", which sent people to re-deploy a
    // function that was working.
    const failure = await describeEdgeFailure(error, response)
    return { error: failure.message, failure }
  }
  if (data?.error) return { error: data.error }
  return { data }
}

export function normaliseUrl(url) {
  if (!url) return url
  return url.startsWith('http') ? url : `https://${url}`
}
