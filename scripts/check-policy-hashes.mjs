#!/usr/bin/env node
/**
 * check-policy-hashes.mjs — the cheap half of staying fresh.
 *
 * Re-scraping and re-extracting every policy on a schedule is expensive and
 * gets slower every time a tool is added. So: fetch each policy page, normalise
 * it, hash it, compare against the stored hash. A full LLM re-extraction (and a
 * human review) is triggered ONLY for rows whose hash actually changed.
 *
 * Usage:
 *   node scripts/check-policy-hashes.mjs                 # check everything
 *   node scripts/check-policy-hashes.mjs --save          # write new hashes
 *   node scripts/check-policy-hashes.mjs --only=chatgpt  # one tool
 *   node scripts/check-policy-hashes.mjs --dry-run       # print the plan, no network
 *   node scripts/check-policy-hashes.mjs --strict        # exit 1 if any fetch fails
 *
 * Honest caveat: normalisation removes scripts, styles, comments and
 * whitespace, but some pages embed CSRF tokens, timestamps or A/B copy. Those
 * produce false positives. A changed hash means "a human should look", never
 * "the policy changed" — which is exactly why a human is always the last step.
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOOLS } from '../src/data/tools.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HASH_FILE = resolve(ROOT, 'data/policy-hashes.json')

const args = process.argv.slice(2)
const flag = (name) => args.some((a) => a === `--${name}`)
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

const SAVE = flag('save')
const DRY = flag('dry-run')
const STRICT = flag('strict')
const ONLY = value('only')
const TIMEOUT = Number(value('timeout') ?? 20000)
const CONCURRENCY = Number(value('concurrency') ?? 4)

function sha256(input) {
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function normalise(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

async function loadBaseline() {
  try {
    return JSON.parse(await readFile(HASH_FILE, 'utf8'))
  } catch {
    return { _meta: { created: null, note: 'Baseline not yet recorded.' }, sources: {} }
  }
}

async function fetchOne(source, toolId) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'aitransparency-policy-hash-check/0.1 (+https://example.org/bot)' },
    })
    const body = res.ok ? await res.text() : ''
    return {
      ok: res.ok,
      status: res.status,
      hash: res.ok ? sha256(normalise(body)) : null,
      bytes: body.length,
    }
  } catch (err) {
    return { ok: false, status: null, hash: null, error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const baseline = await loadBaseline()
  const jobs = []
  for (const tool of TOOLS) {
    if (ONLY && tool.id !== ONLY) continue
    for (const source of tool.policy_sources) jobs.push({ tool, source })
  }

  console.log(`policy hash check — ${jobs.length} sources across ${new Set(jobs.map((j) => j.tool.id)).size} tools`)
  if (DRY) {
    for (const { tool, source } of jobs) console.log(`  would fetch  ${tool.id.padEnd(14)} ${source.url}`)
    console.log('\n(dry run — no requests made)')
    return
  }

  const results = []
  const queue = [...jobs]
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) || 1 }, async () => {
    while (queue.length) {
      const job = queue.shift()
      const key = `${job.tool.id}::${job.source.url}`
      const before = baseline.sources[key]?.hash ?? null
      const res = await fetchOne(job.source, job.tool.id)
      const changed = res.ok && before && res.hash !== before
      const isNew = res.ok && !before
      results.push({ ...job, key, before, after: res.hash, ...res, changed, isNew })
      const mark = !res.ok ? 'ERROR' : isNew ? 'BASELINE' : changed ? 'CHANGED' : 'same'
      console.log(
        `  ${mark.padEnd(8)} ${job.tool.id.padEnd(14)} ${(res.status ?? '—').toString().padEnd(4)} ${job.source.url}`
      )
    }
  })
  await Promise.all(workers)

  const changed = results.filter((r) => r.changed)
  const errors = results.filter((r) => !r.ok)
  const newOnes = results.filter((r) => r.isNew)

  const touchedTools = [...new Set(changed.map((r) => r.tool.id))]

  console.log('\n─────────────────────────────────────────────')
  console.log(`unchanged        ${results.length - changed.length - errors.length - newOnes.length}`)
  console.log(`changed          ${changed.length}`)
  console.log(`new (baseline)   ${newOnes.length}`)
  console.log(`fetch errors     ${errors.length}`)
  console.log(`\ntools needing a re-read + human review: ${touchedTools.length ? touchedTools.join(', ') : 'none'}`)

  if (SAVE) {
    for (const r of results) {
      if (!r.ok) continue
      baseline.sources[r.key] = { hash: r.after, checked_at: new Date().toISOString(), status: r.status }
    }
    baseline._meta = { ...(baseline._meta ?? {}), last_run: new Date().toISOString() }
    await mkdir(dirname(HASH_FILE), { recursive: true })
    await writeFile(HASH_FILE, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8')
    console.log(`\nwrote ${HASH_FILE}`)
  } else {
    console.log('\n(no hashes written — re-run with --save to update the baseline)')
  }

  if (STRICT && errors.length) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
