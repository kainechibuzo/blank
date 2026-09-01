/**
 * cast-vote — the only path by which a vote is written.
 *
 * Everything anti-gaming is checked here, on a machine the voter does not
 * control: identity, captcha, account age, listing status, and the one-vote
 * limit. The browser asks; this decides. The row level security policies in
 * migration 0002 are a second wall behind it.
 *
 * Captcha is verified against hCaptcha's siteverify endpoint using a server
 * secret. If HCAPTCHA_SECRET is not set the check is skipped and noted in the
 * response — the site stays usable before captcha keys exist, and the gap is
 * visible rather than silent.
 *
 * CORS: see supabase/functions/_shared/cors.ts. Every response carries the
 * headers, and OPTIONS is answered, because a CORS failure is indistinguishable
 * from "not deployed" once you are looking at it from the browser.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, withCors } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const HCAPTCHA_SECRET = Deno.env.get('HCAPTCHA_SECRET') ?? ''

Deno.serve(
  withCors(async (req: Request) => {
    if (req.method !== 'POST') return json({ error: 'POST required' }, 405)

    const missing: string[] = []
    if (!SUPABASE_URL) missing.push('SUPABASE_URL')
    if (!ANON_KEY) missing.push('SUPABASE_ANON_KEY')
    if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
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
    if (!user) return json({ error: 'Sign in to vote.' }, 401)

    let listingId: string
    let value: number
    let captchaToken: string | undefined
    try {
      ;({ listingId, value, captchaToken } = await req.json())
    } catch {
      return json({ error: 'Expected JSON body' }, 400)
    }

    if (!listingId || (value !== 1 && value !== -1)) {
      return json({ error: 'listingId and value (1 or -1) are required' }, 400)
    }

    // ── captcha ────────────────────────────────────────────────────────────────
    let captcha = 'skipped'
    if (HCAPTCHA_SECRET) {
      if (!captchaToken) return json({ error: 'Complete the captcha before voting.' }, 400)
      const res = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: HCAPTCHA_SECRET, response: captchaToken }),
      })
      const verdict = await res.json()
      if (!verdict.success) return json({ error: 'Captcha failed. Try again.' }, 400)
      captcha = 'verified'
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // ── eligibility, decided in the database ───────────────────────────────────
    const { data: eligibility } = await admin.rpc('vote_eligibility', { p_listing: listingId })
    if (!eligibility?.eligible) {
      return json({ error: eligibility?.reason ?? 'You cannot vote on this listing.' }, 403)
    }

    // ── one vote per account ───────────────────────────────────────────────────
    // Changing your vote re-stamps created_at, so the decay clock restarts on the
    // vote you currently hold, not the first one you ever cast.
    const { error: writeError } = await admin
      .from('votes')
      .upsert(
        { listing_id: listingId, voter_id: user.id, value, created_at: new Date().toISOString() },
        { onConflict: 'listing_id,voter_id' }
      )

    if (writeError) return json({ error: writeError.message }, 400)

    const [{ data: score }, { data: totals }] = await Promise.all([
      admin.rpc('upvote_score', { p_listing: listingId }),
      admin.rpc('vote_totals', { p_listing: listingId }),
    ])

    return json({
      ok: true,
      yourVote: value,
      upvoteScore: Number(score ?? 0),
      totals: totals?.[0] ?? { up: 0, down: 0, total: 0 },
      captcha,
    })
  })
)
