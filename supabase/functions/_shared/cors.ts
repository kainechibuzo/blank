/**
 * cors.ts — every response from every Edge Function carries these headers.
 *
 * Why this file exists, because the failure it prevents is invisible:
 *
 *   A cross-origin POST from the browser triggers an OPTIONS preflight. If the
 *   preflight comes back without `Access-Control-Allow-Origin`, the browser
 *   never sends the POST at all. If the POST *is* sent but its response lacks
 *   the header, the browser throws the response away before our code can read
 *   it. In both cases `fetch` rejects with an opaque TypeError.
 *
 *   That TypeError is indistinguishable — from inside the browser — from a
 *   function that was never deployed, or from a project ref in
 *   `VITE_SUPABASE_URL` that does not resolve. So the only way to keep those
 *   three failures apart is to make sure this one never happens.
 *
 * So: answer OPTIONS, and put the headers on every other response too.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  // The browser sends `authorization` and `content-type`, and supabase-js adds
  // `apikey` and `x-client-info`. Anything not listed here is refused at the
  // preflight, and the request dies before it is sent.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

/** JSON response, with CORS. The only way these functions should ever answer. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

/** Answer the preflight. Without this, nothing else in the function runs. */
export function preflight(): Response {
  return new Response('ok', { headers: corsHeaders })
}

/**
 * Wrap a handler so a thrown error becomes a legible, CORS-headed 500.
 *
 * An uncaught throw in a Deno Edge Function comes back as a bare 500 that does
 * not carry our headers — which the browser reports exactly as "not deployed".
 * Crashing legibly is the difference between a founder fixing it in a minute
 * and a founder re-deploying a function that was already fine.
 */
export function withCors(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return preflight()
    try {
      return await handler(req)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      return json({ error: 'Function crashed before it could answer.', detail }, 500)
    }
  }
}
