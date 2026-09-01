/**
 * check-edge-diagnosis.mjs — proves that Edge Function failures are classified
 * by what the browser can actually observe, not by the wording of a reply.
 *
 * This is the regression guard for a real bug: a deployed `verify-snippet` that
 * answered `404 {"error": "Listing not found, or not yours"}` was reported to
 * users as "The verify-snippet function is not deployed yet", because the old
 * code inferred the cause from the text of the response. People were sent to
 * re-deploy a function that was working.
 *
 * Node only. Nothing in the browser imports this.
 */

import { describeEdgeFailure } from '../src/lib/edge.js'

const err = (name, message, context = undefined) => ({ name, message, context })
const body = (payload, status) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })

/** Our functions always answer JSON with an `error` string (see _shared/cors.ts). */
const ours = (payload, status) => body(payload, status)
/** Supabase's gateway uses a different shape — that difference is the signal. */
const gateway = (payload, status) => body(payload, status)

const cases = [
  {
    label: 'the browser never got a response (CORS / DNS / not deployed)',
    error: err('FunctionsFetchError', 'Failed to send a request to the Edge Function'),
    deployed: null,
    reason: 'unreachable',
    contains: 'project reference in VITE_SUPABASE_URL',
  },
  {
    // THE REGRESSION. This is a healthy, deployed function saying no.
    label: 'our own 404 — "Listing not found, or not yours"',
    error: err(
      'FunctionsHttpError',
      'Edge Function returned a non-2xx status code',
      ours({ error: 'Listing not found, or not yours' }, 404)
    ),
    deployed: true,
    reason: 'rejected',
    contains: 'Listing not found, or not yours',
  },
  {
    label: 'gateway 404 — no function by that name',
    error: err(
      'FunctionsHttpError',
      'Edge Function returned a non-2xx status code',
      gateway({ message: 'no function found' }, 404)
    ),
    deployed: false,
    reason: 'missing',
    contains: 'No function with this name is deployed',
  },
  {
    label: '401 — caller not signed in, or JWT refused',
    error: err('FunctionsHttpError', 'non-2xx', ours({ error: 'Not signed in' }, 401)),
    deployed: true,
    reason: 'unauthorised',
    contains: 'Not signed in',
  },
  {
    label: '500 — deployed, but its secrets were never set',
    error: err(
      'FunctionsHttpError',
      'non-2xx',
      ours(
        {
          error: 'Function secrets are not set: SUPABASE_URL.',
          hint: 'supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...',
        },
        500
      )
    ),
    deployed: true,
    reason: 'crashed',
    contains: 'Function secrets are not set',
    hint: 'supabase secrets set',
  },
  {
    label: '400 — the probe body, i.e. our code is running',
    error: err('FunctionsHttpError', 'non-2xx', ours({ error: 'listingId is required' }, 400)),
    deployed: true,
    reason: 'rejected',
    contains: 'listingId is required',
  },
  {
    label: 'relay error — deployed, platform could not reach it',
    error: err('FunctionsRelayError', 'Relay Error invoking the Edge Function'),
    deployed: true,
    reason: 'relay',
    contains: 'could not relay',
  },
  {
    label: 'bare TypeError from fetch (CORS)',
    error: err('TypeError', 'Failed to fetch'),
    deployed: null,
    reason: 'unreachable',
  },
]

let failed = 0
for (const c of cases) {
  const got = await describeEdgeFailure(c.error, null)
  const problems = []
  if (got.deployed !== c.deployed) {
    problems.push(`deployed: expected ${String(c.deployed)}, got ${String(got.deployed)}`)
  }
  if (got.reason !== c.reason) problems.push(`reason: expected ${c.reason}, got ${got.reason}`)
  if (c.contains && !got.message.includes(c.contains)) {
    problems.push(`message should mention "${c.contains}", got: ${got.message}`)
  }
  if (c.hint && !(got.hint ?? '').includes(c.hint)) problems.push(`hint missing: ${got.hint}`)

  const verdict = got.deployed === true ? 'deployed' : got.deployed === false ? 'NOT deployed' : 'unknown'
  if (problems.length) failed++
  console.log(
    `${problems.length ? 'FAIL' : 'PASS'}  ${c.label}\n      ${verdict} (${got.reason}) — ${got.message}${problems.length ? `\n      ${problems.join('\n      ')}` : ''}`
  )
}

console.log(`\n${cases.length - failed}/${cases.length} edge-failure cases classified correctly`)
process.exit(failed ? 1 : 0)
