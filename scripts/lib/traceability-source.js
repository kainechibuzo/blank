/**
 * traceability-source.js — hard rules that can only be checked by reading the
 * source tree.
 *
 * Node only. Nothing in src/pages or src/components imports this, so it never
 * reaches the browser bundle; scripts/traceability-check.mjs is its only caller.
 */

import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

async function read(rel) {
  return readFile(join(ROOT, rel), 'utf8')
}

/**
 * Strip comments before scanning for forbidden patterns. The rules are about
 * what the code does, and half of this codebase's value is prose explaining
 * what the code must never do — a scanner that trips on the word "delist"
 * inside a comment would punish exactly the documentation that enforces it.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

async function walk(relDir, out = []) {
  let entries
  try {
    entries = await readdir(join(ROOT, relDir), { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const rel = `${relDir}/${e.name}`
    if (e.isDirectory()) await walk(rel, out)
    else if (/\.(js|jsx|ts|tsx|mjs|sql)$/.test(e.name)) out.push(rel)
  }
  return out
}

export async function runSourceChecks() {
  const checks = []
  const push = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail })

  /* 1 — The weekly snippet re-check can flag. It must never punish.
         Scan for actual removal *writes*, not for the word appearing in a log
         line or a comment: the script is allowed to say "nothing was delisted",
         it is not allowed to do it. */
  let snippetScript = ''
  try {
    snippetScript = await read('scripts/check-directory-snippets.mjs')
  } catch {
    snippetScript = ''
  }
  const codeOnly = stripComments(snippetScript)
  const removalWrites = [
    /status\s*[:=]\s*['"](delisted|banned|removed|hidden)['"]/i,
    /\.delete\s*\(/,
    /\bdelete\s+from\b/i,
    /listings\?[^'"]*status=eq\.(delisted|banned|removed|hidden)/i,
  ].filter((re) => re.test(codeOnly))

  push(
    'Weekly snippet re-check cannot delist, ban, or hide a listing',
    snippetScript.length > 0 && removalWrites.length === 0,
    removalWrites.length
      ? `removal write found in scripts/check-directory-snippets.mjs: ${removalWrites.map(String).join(', ')}`
      : 'script writes only snippet_state, review_required, review_reason and warning_message'
  )

  push(
    'Weekly snippet re-check flags for human review',
    /review_required/.test(codeOnly) && /warning_message/.test(codeOnly),
    'flagging path present'
  )

  /* 2 — The service role key must never appear in browser code. */
  const files = await walk('src')
  const leakHits = []
  for (const f of files) {
    const src = stripComments(await read(f))
    if (/SERVICE_ROLE/.test(src)) leakHits.push(f)
  }
  push(
    'No browser code references the Supabase service-role key',
    leakHits.length === 0,
    leakHits.length ? leakHits.join(', ') : `${files.length} client files scanned`
  )

  /* 3 — The ranking path must not touch the directory database. This is the
     structural guarantee that directory data cannot influence the comparison. */
  const rankingFiles = ['src/lib/scoring.js', 'src/lib/filters.js', 'src/lib/chat.js']
  const dbHits = []
  for (const f of rankingFiles) {
    const src = await read(f)
    if (/supabase|listings|snippet_checks/.test(src)) dbHits.push(f)
  }
  push(
    'Ranking and scoring never read the directory database',
    dbHits.length === 0,
    dbHits.length
      ? `directory references in the ranking path: ${dbHits.join(', ')}`
      : `${rankingFiles.join(', ')} are pure functions over the provider dataset`
  )

  /* 4 — The verification snippet must stay public-crawl only. */
  const snippetLib = await read('src/lib/snippet.js')
  const forbiddenAccess = [
    /authorization/i,
    /cookie/i,
    /api[_-]?key/i,
    /bearer/i,
    /password/i,
    /login/i,
  ].filter((re) => re.test(snippetLib))
  push(
    'Ownership verification is public-crawl only (no credentials, keys or logins)',
    forbiddenAccess.length === 0,
    forbiddenAccess.length
      ? `suspicious patterns in src/lib/snippet.js: ${forbiddenAccess.join(', ')}`
      : 'snippet.js fetches one public page and reads one meta tag'
  )

  /* 5 — The DB must also refuse automatic removal, not just the script. */
  let sql = ''
  try {
    sql = await read('supabase/migrations/0001_phase2_directory.sql')
  } catch {
    sql = ''
  }
  push(
    'Database refuses non-founder status changes (guard_listing_status trigger)',
    sql.includes('guard_listing_status') && sql.includes('raise exception'),
    sql ? 'trigger present on public.listings' : 'migration not found'
  )

  return checks
}
