/**
 * sites.js — one identity for a website.
 *
 * A submission is a claim about a site, so "is this the same site?" needs one
 * answer. Two people typing the same address differently — with or without
 * https, www, a trailing slash, a tracking query string — are claiming the same
 * thing, and treating them as different listings is how duplicates happen.
 *
 * The SQL mirror lives in supabase/migrations/0005 (public.site_key_of). If you
 * change the rules here, change them there: the constraint depends on both
 * agreeing.
 */
export function siteKeyOf(url) {
  if (!url) return ''
  const raw = url.trim().toLowerCase()
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname.replace(/\/+$/, '')
    return `${host}${path}`
  } catch {
    // Not parseable: fall back to the same text rules the SQL function uses.
    return raw
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[?#].*$/, '')
      .replace(/\/+$/, '')
  }
}
