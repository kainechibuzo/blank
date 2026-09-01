/**
 * edge.js — the only place that turns an Edge Function failure into a sentence.
 *
 * WHY THIS FILE EXISTS. `supabase.functions.invoke()` collapses several very
 * different failures into one `error` object, and the old code guessed which one
 * had happened by looking at the error *message*. That is how a function that
 * was deployed and cheerfully answering 404s ended up described to a user as
 * "The verify-snippet function is not deployed yet" — the body of a legitimate
 * reply contained the words "not found", and the guesser read that as "the
 * function does not exist".
 *
 * The message text is not the signal. The error *class* and the HTTP *status*
 * are:
 *
 *   FunctionsFetchError  the browser never got a response at all. Three causes,
 *                        and the browser genuinely cannot tell them apart:
 *                        not deployed, wrong project ref in VITE_SUPABASE_URL,
 *                        or CORS blocked the reply. Say all three.
 *
 *   FunctionsHttpError   something answered. `error.context.status` says what.
 *                        404 is the interesting one — the gateway returns it
 *                        when no function of that name exists, but our own
 *                        functions also return 404 for a listing that is not
 *                        yours. Those are distinguished by whether the body is
 *                        one of ours, not by the status code.
 *
 *   FunctionsRelayError  Supabase's relay could not reach the function. It is
 *                        deployed; the platform failed.
 *
 * Nothing here decides "not deployed" from a string that happens to sound like
 * it. `deployed` is true, false, or null — and null means "unknown", which is
 * the honest answer when the browser cannot know.
 */

import { supabase, supabaseHost } from './supabase.js'

/** The exact URL the browser will call. Printed on /admin so a typo is visible. */
export function edgeFunctionUrl(name) {
  const host = supabaseHost()
  return host ? `https://${host}/functions/v1/${name}` : null
}

/**
 * Read the body of a failed response without disturbing it.
 *
 * `FunctionsHttpError.message` is a fixed string, so the body is still
 * unread — we clone and parse it to find out whether the reply came from our
 * own code or from Supabase's gateway.
 */
async function readBody(response) {
  if (!response || typeof response.clone !== 'function') return null
  try {
    const text = await response.clone().text()
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return { error: text.slice(0, 300) }
    }
  } catch {
    return null
  }
}

/**
 * Classify a failed `supabase.functions.invoke()` call.
 *
 * Returns `{ deployed, status, reason, message }` where `deployed` is
 * `true` (an HTTP response arrived), `false` (the gateway says no such
 * function) or `null` (the browser never got an answer, so it cannot know).
 */
export async function describeEdgeFailure(error, response) {
  const name = error?.name ?? ''
  const status = Number(error?.context?.status ?? response?.status ?? 0) || null

  // 1 — No response ever arrived. Wrong URL, not deployed, or CORS. Unknown.
  if (
    name === 'FunctionsFetchError' ||
    (!status && /TypeError|Failed to fetch|NetworkError/i.test(`${name} ${error?.message ?? ''}`))
  ) {
    return {
      deployed: null,
      status: null,
      reason: 'unreachable',
      message:
        'The request never reached the function. That happens when it is not deployed, when the ' +
        'project reference in VITE_SUPABASE_URL is wrong, or when the browser blocked the reply ' +
        'for missing CORS headers — and from a browser those three look identical.',
    }
  }

  // 2 — Supabase's relay could not reach it. Deployed; platform-side failure.
  if (name === 'FunctionsRelayError') {
    return {
      deployed: true,
      status,
      reason: 'relay',
      message: 'Supabase could not relay the request to the function. It is deployed; the platform failed to reach it.',
    }
  }

  // 3 — Something answered. Now: was it our code, or Supabase's gateway?
  //
  // Every response from our own functions is JSON with an `error` string (see
  // supabase/functions/_shared/cors.ts). The gateway's 404 for a function that
  // does not exist is not shaped that way. That single structural difference is
  // what separates "the function told you no" from "there is no function" —
  // which is precisely the distinction the old message-sniffing got wrong.
  const body = await readBody(error?.context ?? response)
  const ours = typeof body?.error === 'string'
  const said = ours ? body.error : null
  const hint = typeof body?.hint === 'string' ? body.hint : null

  if (status === 404) {
    return ours
      ? { deployed: true, status, reason: 'rejected', message: said, hint }
      : {
          deployed: false,
          status,
          reason: 'missing',
          message: 'No function with this name is deployed in this project (HTTP 404).',
          hint,
        }
  }

  if (status === 401) {
    return {
      deployed: true,
      status,
      reason: 'unauthorised',
      message:
        said ??
        'The function rejected the request: HTTP 401. The caller is not signed in, or the session token was refused.',
      hint,
    }
  }

  if (status >= 500) {
    return {
      deployed: true,
      status,
      reason: 'crashed',
      message: said ?? `The function is deployed but failed while running (HTTP ${status}).`,
      hint,
    }
  }

  if (status) {
    return {
      deployed: true,
      status,
      reason: 'rejected',
      message: said ?? body?.message ?? `The function answered HTTP ${status}.`,
      hint,
    }
  }

  return {
    deployed: null,
    status: null,
    reason: 'unknown',
    message: said ?? body?.message ?? error?.message ?? 'The request failed.',
    hint,
  }
}

/**
 * Probe whether a function is deployed, without relying on it succeeding.
 *
 * The empty body is deliberate. Both functions reject it with a 400 returned by
 * *our own code*, before they touch the database or write anything. So:
 *
 *   400  → deployed, and our code is running
 *   404  → the gateway has no function by that name
 *   401  → deployed, but the caller's session was refused
 *   5xx  → deployed, but broken — usually missing function secrets
 *   fetch failure → unreachable (URL, CORS, or genuinely not deployed)
 *
 * A probe that sends a real-looking payload instead would blur the 404 case,
 * which is the one thing this is trying to detect.
 */
export async function probeEdgeFunction(name) {
  if (!supabase) return { deployed: null, status: null, reason: 'unconfigured', message: 'Supabase is not configured.' }
  try {
    const { error, response } = await supabase.functions.invoke(name, { body: {} })
    if (!error) return { deployed: true, status: 200, reason: 'ok', message: 'Answered.' }
    return await describeEdgeFailure(error, response)
  } catch (err) {
    return await describeEdgeFailure(err, null)
  }
}
