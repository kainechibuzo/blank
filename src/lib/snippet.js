/**
 * snippet.js — ownership verification, public crawl only.
 *
 * The snippet is the only thing a submitter adds to their site. Nothing here
 * asks for credentials, API keys, or backend access; it fetches the public
 * homepage and looks for one meta tag. The submitter can remove it at any time,
 * which is the point: control is proven, not seized.
 *
 * This module has no platform-specific imports, on purpose. It is imported by
 *   - the Supabase Edge Function (Deno, on-demand verification)
 *   - scripts/check-directory-snippets.mjs (Node, the weekly re-check)
 * so the two paths can never drift into different definitions of "verified".
 */

export const SNIPPET_META_NAME = 'wt-directory-verify'
export const TOKEN_PREFIX = 'wt_verify_'

/** The exact tag a submitter pastes into their <head>. */
export function snippetTag(token) {
  return `<meta name="${SNIPPET_META_NAME}" content="${token}">`
}

/** Human-readable instructions shown once, at submission. */
export function snippetInstructions(token) {
  return [
    `Add this tag to the <head> of ${'your site'}'s homepage, then press "Verify now":`,
    '',
    `  ${snippetTag(token)}`,
    '',
    'It contains no tracking, no script, and no request to any server. It is a',
    'static line of HTML that proves whoever controls the site submitted it.',
    'You can remove it yourself at any time — the weekly check will notice and',
    'flag the listing for human review (it will not remove it automatically).',
  ].join('\n')
}

const HEX = '0123456789abcdef'

/** Cryptographically random where available, so tokens are not guessable. */
export function makeToken(randomBytes = null) {
  if (randomBytes) {
    return TOKEN_PREFIX + Array.from(randomBytes(16), (b) => HEX[b >> 4] + HEX[b & 15]).join('')
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return makeToken(() => bytes)
  }
  // Last resort for non-crypto environments (the SSR smoke test, mainly).
  return TOKEN_PREFIX + Array.from({ length: 32 }, () => HEX[Math.floor(Math.random() * 16)]).join('')
}

/**
 * Fetch a homepage and classify the snippet.
 * @returns {{outcome:'ok'|'altered'|'missing'|'unreachable', httpStatus:number|null,
 *            foundToken:string|null, note:string}}
 */
export async function checkSnippet(url, expectedToken, { fetchImpl = fetch, timeout = 15000 } = {}) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null

  try {
    const res = await fetchImpl(url, {
      signal: controller?.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'wt-directory-verify/0.1 (+https://example.org/bot)' },
    })
    const html = res.ok ? await res.text() : ''
    if (!res.ok) {
      return {
        outcome: 'unreachable',
        httpStatus: res.status,
        foundToken: null,
        note: `Page returned HTTP ${res.status}.`,
      }
    }

    const found = extractToken(html)
    if (!found) {
      return {
        outcome: 'missing',
        httpStatus: res.status,
        foundToken: null,
        note: 'No verification tag found in the page.',
      }
    }
    if (found === expectedToken) {
      return {
        outcome: 'ok',
        httpStatus: res.status,
        foundToken: found,
        note: 'Verification tag present and matching.',
      }
    }
    return {
      outcome: 'altered',
      httpStatus: res.status,
      foundToken: found.slice(0, 64),
      note: 'A verification tag was found but its content does not match the issued token.',
    }
  } catch (err) {
    return {
      outcome: 'unreachable',
      httpStatus: null,
      foundToken: null,
      note: `Could not fetch the page: ${err?.message ?? 'unknown error'}`,
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Pull the content attribute out of <meta name="wt-directory-verify" ...>. */
export function extractToken(html) {
  if (typeof html !== 'string') return null
  const re = new RegExp(`<meta[^>]+name=["']${SNIPPET_META_NAME}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  if (!tag) return null
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null
}
