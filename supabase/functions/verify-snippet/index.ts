/**
 * verify-snippet — on-demand ownership verification, invoked from the browser
 * with `supabase.functions.invoke('verify-snippet', { body: { listingId } })`.
 *
 * Public crawl only: it fetches the submitter's homepage once and looks for one
 * meta tag. No credentials, no API keys, no backend access, nothing injected.
 *
 * It can promote pending → listed when the tag matches. It can never delist.
 * Delisting is a founder decision, made by hand, after human review.
 *
 * TWO THINGS HERE EXIST BECAUSE THEY WERE LEARNED THE HARD WAY:
 *
 *  1. Every response carries CORS headers (supabase/functions/_shared/cors.ts).
 *     Without them the browser discards the reply and `fetch` rejects with an
 *     opaque TypeError — which is indistinguishable from "not deployed".
 *
 *  2. Nothing here guesses. A missing secret or a throw returns a 500 with a
 *     message that says what is missing, rather than a bare crash that the
 *     browser reports as a network failure.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkSnippet } from '../_shared/snippet.js'
import { json, withCors } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/** Names only — never values. Enough to tell someone what to set. */
function missingSecrets(): string[] {
  const missing: string[] = []
  if (!SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!ANON_KEY) missing.push('SUPABASE_ANON_KEY')
  if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

Deno.serve(
  withCors(async (req: Request) => {
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405)

    // A missing secret used to throw inside createClient, producing a bare 500
    // that looked, from the browser, exactly like an undeployed function.
    const missing = missingSecrets()
    if (missing.length) {
      return json(
        {
          error: `Function secrets are not set: ${missing.join(', ')}.`,
          hint: 'supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...',
        },
        500
      )
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Not signed in' }, 401)

    let listingId: string
    try {
      ;({ listingId } = await req.json())
    } catch {
      return json({ error: 'Expected JSON body with listingId' }, 400)
    }
    if (!listingId) return json({ error: 'listingId is required' }, 400)

    // Row level security means this only returns rows the caller owns, or any row
    // if they are a founder.
    const { data: listing, error } = await userClient
      .from('listings')
      .select('id, url, verify_token, status')
      .eq('id', listingId)
      .maybeSingle()

    if (error || !listing) return json({ error: 'Listing not found, or not yours' }, 404)

    const result = await checkSnippet(listing.url, listing.verify_token)

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const now = new Date().toISOString()
    const wasListed = listing.status === 'listed'

    await admin.from('snippet_checks').insert({
      listing_id: listing.id,
      checked_at: now,
      outcome: result.outcome,
      http_status: result.httpStatus,
      expected_token: listing.verify_token,
      found_token: result.foundToken,
      note: result.note,
    })

    // Flag for review only when something that was previously confirmed has
    // stopped confirming. A pending listing simply has not got there yet, and
    // warning someone about their own draft is noise.
    const needsReview = wasListed && result.outcome !== 'ok'

    await admin
      .from('listings')
      .update({
        snippet_state: result.outcome,
        last_checked_at: now,
        verified_at: result.outcome === 'ok' ? now : undefined,
        review_required: needsReview,
        review_reason: needsReview
          ? `Snippet ${result.outcome} after previously being confirmed.`
          : null,
      })
      .eq('id', listing.id)

    return json({
      ...result,
      reviewRequired: needsReview,
      message:
        result.outcome === 'ok'
          ? 'Ownership confirmed. The listing is public and will be re-checked weekly.'
          : `Tag ${result.outcome}. ${result.note}`,
    })
  })
)
