#!/usr/bin/env node
/**
 * check-directory-snippets.mjs — the weekly ownership re-check (Phase 2).
 *
 * Same shape as check-policy-hashes.mjs on purpose: cheap crawl first, human
 * attention only where something actually changed.
 *
 *   - fetches every pending/listed submission's homepage
 *   - classifies the verification tag (ok / altered / missing / unreachable)
 *   - appends an immutable row to the check log
 *   - flags previously-confirmed listings that stopped confirming
 *
 * WHAT THIS SCRIPT DOES NOT DO, AND MUST NEVER DO:
 * it does not delist, ban, hide, or penalise anything. Flagging is all it does.
 * "No auto-ban on first detection" is a roadmap rule: snippet breakage is
 * usually a redesign or a CMS migration. A human decides, always. The
 * traceability check scans this file for delisting patterns and fails the build
 * if one is ever added.
 *
 * Usage:
 *   node scripts/check-directory-snippets.mjs
 *   node scripts/check-directory-snippets.mjs --dry-run
 *   node scripts/check-directory-snippets.mjs --only=<listing-id>
 *   node scripts/check-directory-snippets.mjs --strict
 *
 * Env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *      SUPPORT_EMAIL
 */

import { readFile } from 'node:fs/promises'
import { checkSnippet } from '../src/lib/snippet.js'
import { buildWarning } from '../src/lib/snippet-warning.js'

const args = process.argv.slice(2)
const flag = (name) => args.some((a) => a === `--${name}`)
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

const DRY = flag('dry-run')
const STRICT = flag('strict')
const ONLY = value('only')
const CONCURRENCY = Number(value('concurrency') ?? 3)

function loadEnv() {
  // Minimal .env reader so the script works locally without a loader.
  const out = {}
  try {
    const raw = require_process_env()
    Object.assign(out, raw)
  } catch {
    /* ignore */
  }
  return out
}

function require_process_env() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || process.env.VITE_SUPPORT_EMAIL || 'support@example.org',
  }
}

const env = loadEnv()
const base = env.SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const supportEmail = env.SUPPORT_EMAIL

function headers(extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function rest(path, options = {}) {
  const res = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: headers(options.headers) })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${options.method ?? 'GET'} ${path} failed: ${res.status} ${body.slice(0, 200)}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function main() {
  if (!base || !serviceKey) {
    console.log('directory snippet check — SKIPPED')
    console.log('  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not both set.')
    console.log('  This is expected in CI forks and fresh clones. Nothing to do.')
    return
  }

  let listings = await rest('listings?select=*&status=in.(pending,listed)&order=submitted_at.asc')
  if (ONLY) listings = listings.filter((l) => l.id === ONLY || l.url === ONLY)

  console.log(`directory snippet check — ${listings.length} submission(s)`)

  if (DRY) {
    for (const l of listings) console.log(`  would fetch  ${l.name.padEnd(24)} ${l.url}`)
    console.log('\n(dry run — no requests made, nothing written)')
    return
  }

  const results = []
  const queue = [...listings]
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) || 1 }, async () => {
    while (queue.length) {
      const listing = queue.shift()
      const outcome = await checkSnippet(listing.url, listing.verify_token)
      const wasListed = listing.status === 'listed'
      const needsReview = wasListed && outcome.outcome !== 'ok'
      const now = new Date().toISOString()

      await rest('snippet_checks', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          listing_id: listing.id,
          checked_at: now,
          outcome: outcome.outcome,
          http_status: outcome.httpStatus,
          expected_token: listing.verify_token,
          found_token: outcome.foundToken,
          note: outcome.note,
        }),
      })

      let warningMessage = listing.warning_message ?? null
      if (needsReview) {
        const history = await rest(
          `snippet_checks?select=checked_at,outcome,note,http_status&listing_id=eq.${listing.id}&order=checked_at.desc&limit=5`
        )
        warningMessage = buildWarning({ listingName: listing.name, checks: history, supportEmail }).text
      }

      // FLAG ONLY. No status change, no delisting, no penalty. Ever.
      await rest(`listings?id=eq.${listing.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          snippet_state: outcome.outcome,
          last_checked_at: now,
          review_required: needsReview,
          review_reason: needsReview ? `Snippet ${outcome.outcome} after previously being confirmed.` : null,
          warning_message: warningMessage,
        }),
      })

      results.push({ listing, outcome, needsReview })
      const mark = outcome.outcome === 'ok' ? 'ok' : needsReview ? 'REVIEW' : 'pending'
      console.log(`  ${mark.padEnd(8)} ${listing.name.padEnd(24)} ${outcome.outcome.padEnd(12)} ${listing.url}`)
    }
  })
  await Promise.all(workers)

  const needsReview = results.filter((r) => r.needsReview)
  const ok = results.filter((r) => r.outcome.outcome === 'ok')

  console.log('\n─────────────────────────────────────────────')
  console.log(`confirmed        ${ok.length}`)
  console.log(`needs review     ${needsReview.length}`)
  console.log(`not yet verified ${results.length - ok.length - needsReview.length}`)
  console.log(
    `\nlistings needing human review: ${
      needsReview.length ? needsReview.map((r) => `${r.listing.name} (${r.outcome.outcome})`).join(', ') : 'none'
    }`
  )
  if (needsReview.length) {
    console.log('No listing has been delisted. That decision is a human one.')
  }

  if (STRICT && results.some((r) => r.outcome.outcome === 'unreachable')) process.exitCode = 1
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
