#!/usr/bin/env node
/**
 * check-policy-hashes.mjs — the policy observer.
 *
 * WHAT IT DOES: fetches every policy page the dataset cites, records what it
 * saw, hashes it, and compares against last time. Runs weekly in GitHub
 * Actions; the committed result is `data/policy-hashes.json`.
 *
 * WHAT IT IS NOT: it is not a verifier, and it never writes a value.
 *
 *   - It records OBSERVATIONS: which patterns a page matched, how often, and
 *     how confident that makes a *suggestion*. See src/lib/policy-patterns.js.
 *   - It cannot set `verification.status` to 'verified' — not in tools.js, not
 *     anywhere. A machine that fetched a page is not a person who read it. The
 *     two dates stay separate forever: `checked_at` (bot) and `last_verified`
 *     (human).
 *   - A match is a hint, not a finding. Policy prose is full of conditionals,
 *     carve-outs and marketing, so a suggestion is only ever a starting point
 *     for a person. Conflicts are reported as conflicts, never resolved here.
 *
 * NO POLICY TEXT IS STORED. Matches record the pattern id and a count — never
 * the sentence, never the surrounding words. The project paraphrases policy and
 * never quotes it, and a bot with a database is exactly where that rule would
 * die quietly. If you need to read the sentences to judge a suggestion, run
 * with --excerpts: that writes a GITIGNORED local file for your eyes only, and
 * it is never committed, never uploaded, never rendered.
 *
 * Honest caveat: normalisation strips scripts, styles and whitespace, but pages
 * embed CSRF tokens, timestamps and A/B copy. A changed hash means "a human
 * should look", never "the policy changed".
 *
 * Usage:
 *   node scripts/check-policy-hashes.mjs                 # check everything
 *   node scripts/check-policy-hashes.mjs --save          # record this run
 *   node scripts/check-policy-hashes.mjs --only=chatgpt  # one tool
 *   node scripts/check-policy-hashes.mjs --dry-run       # print the plan, no network
 *   node scripts/check-policy-hashes.mjs --strict        # exit 1 if any fetch fails
 *   node scripts/check-policy-hashes.mjs --excerpts      # also write local-only excerpts
 *   node scripts/check-policy-hashes.mjs --json          # machine-readable report
 *   node scripts/check-policy-hashes.mjs --fixtures=test/fixtures/policy-pages
 *                                                        # no network; read saved pages
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOOLS } from '../src/data/tools.js'
import { detectAll, detectField, PATTERN_FIELDS } from '../src/lib/policy-patterns.js'
import { FIELDS } from '../src/data/schema.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HASH_FILE = resolve(ROOT, 'data/policy-hashes.json')
/** Local, gitignored, for a human judging a suggestion. Never committed. */
const EXCERPT_FILE = resolve(ROOT, 'data/policy-excerpts.local.json')

const args = process.argv.slice(2)
const flag = (name) => args.some((a) => a === `--${name}`)
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]

const SAVE = flag('save')
const DRY = flag('dry-run')
const STRICT = flag('strict')
const EXCERPTS = flag('excerpts')
const FIXTURES = value('fixtures')
const AS_JSON = flag('json')
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
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function pageTitle(html) {
  const m = html.match(/<title[^>]*>([^<]{0,200})<\/title>/i)
  return m ? m[1].trim().slice(0, 160) : null
}

async function loadBaseline() {
  try {
    return JSON.parse(await readFile(HASH_FILE, 'utf8'))
  } catch {
    return {
      _meta: { schema: 2, created: null, note: 'Baseline not yet recorded.' },
      sources: {},
      observations: {},
    }
  }
}

/**
 * With --fixtures, read saved pages instead of hitting the network.
 *
 * Saved pages are how the observer is tested without depending on anyone's
 * website being up, and how a person can re-run the analysis on a page they
 * already fetched. The result is flagged `origin: 'fixture'` so a fixture run
 * can never be mistaken for a real observation.
 */
async function readFixture(toolId, index) {
  try {
    const raw = await readFile(resolve(ROOT, FIXTURES, `${toolId}__${index}.html`), 'utf8')
    return { ok: true, status: 200, raw, origin: 'fixture' }
  } catch {
    return null
  }
}

async function fetchOne(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'aitransparency-policy-observer/0.2 (+https://example.org/bot)',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    const body = res.ok ? await res.text() : ''
    return { ok: res.ok, status: res.status, raw: body }
  } catch (err) {
    return { ok: false, status: null, raw: '', error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Sentences around each match — for a human, on their own machine, never in
 * the repository. Deliberately not part of what gets committed.
 */
function excerptsFor(text) {
  const out = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  for (const field of PATTERN_FIELDS) {
    for (const s of sentences) {
      if (s.length < 40 || s.length > 600) continue
      const hit = detectFieldHit(field, s)
      if (hit) out.push({ field, pattern: hit.id, text: s.trim() })
    }
  }
  return out
}

function detectFieldHit(field, sentence) {
  const res = detectField(field, sentence)
  return res.matched.length ? res.matched[0] : null
}

async function main() {
  const baseline = await loadBaseline()
  const jobs = []
  for (const tool of TOOLS) {
    if (ONLY && tool.id !== ONLY) continue
    ;(tool.policy_sources ?? []).forEach((source, i) => jobs.push({ tool, source, sourceIndex: i + 1 }))
  }

  const say = (s) => {
    if (!AS_JSON) console.log(s)
  }

  say(`policy observer — ${jobs.length} sources across ${new Set(jobs.map((j) => j.tool.id)).size} tools`)
  if (DRY) {
    for (const { tool, source } of jobs) say(`  would fetch  ${tool.id.padEnd(14)} ${source.url}`)
    say('\n(dry run — no requests made)')
    return
  }

  const results = []
  const queue = [...jobs]
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) || 1 }, async () => {
    while (queue.length) {
      const job = queue.shift()
      const key = `${job.tool.id}::${job.source.url}`
      const before = baseline.sources[key] ?? null
      const res =
        (FIXTURES && (await readFixture(job.tool.id, job.sourceIndex))) ||
        (FIXTURES ? { ok: false, status: null, raw: '', error: 'no fixture' } : await fetchOne(job.source.url))

      let entry = {
        url: job.source.url,
        label: job.source.label ?? null,
        tool_id: job.tool.id,
        ok: res.ok,
        status: res.status,
        error: res.error ?? null,
        checked_at: new Date().toISOString(),
        origin: res.origin ?? 'network',
        hash: null,
        bytes: 0,
        title: null,
        signals: null,
      }

      if (res.ok) {
        const text = normalise(res.raw)
        entry.hash = sha256(text.toLowerCase())
        entry.bytes = res.raw.length
        entry.title = pageTitle(res.raw)
        entry.signals = detectAll(text.toLowerCase())
        if (EXCERPTS) entry._excerpts = excerptsFor(text)
      }

      const changed = Boolean(entry.hash && before?.hash && entry.hash !== before.hash)
      const isNew = Boolean(entry.hash && !before?.hash)
      results.push({ ...job, key, before, entry, changed, isNew })

      const mark = !res.ok ? 'ERROR' : isNew ? 'BASELINE' : changed ? 'CHANGED' : 'same'
      say(
        `  ${mark.padEnd(8)} ${job.tool.id.padEnd(14)} ${(res.status ?? '—').toString().padEnd(4)} ${job.source.url}`
      )
    }
  })
  await Promise.all(workers)

  // ── roll the per-source signals up to per-tool observations ────────────────
  const observations = {}
  for (const tool of TOOLS) {
    const rows = results.filter((r) => r.tool.id === tool.id && r.entry.signals)
    if (!rows.length) continue
    const fields = {}
    for (const field of PATTERN_FIELDS) {
      const votes = {}
      let conflicted = false
      let best = null
      for (const r of rows) {
        const sig = r.entry.signals[field]
        if (!sig || !sig.suggested) continue
        conflicted = conflicted || sig.conflicted
        votes[sig.suggested] = (votes[sig.suggested] ?? 0) + (sig.confidence === 'high' ? 2 : 1)
        if (!best || sig.confidence === 'high') best = sig.confidence
      }
      const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1])
      if (!ranked.length) continue

      // Residency is not an enum — it carries regions[] and a jurisdiction. The
      // observer notes what it saw but never proposes a value for it, because
      // there is no single value to propose.
      const isEnum = Object.keys(FIELDS[field]?.options ?? {}).length > 0
      fields[field] = isEnum
        ? {
            suggested: ranked[0][0],
            confidence: conflicted ? 'conflicted' : (best ?? 'medium'),
            agreement: ranked.length === 1 ? 'unanimous' : 'split',
            sources: ranked.length,
          }
        : { informational: true, observed: ranked.map(([v]) => v), sources: ranked.length }
    }
    if (Object.keys(fields).length) {
      observations[tool.id] = { observed_at: new Date().toISOString(), fields }
    }
  }

  const changed = results.filter((r) => r.changed)
  const errors = results.filter((r) => !r.entry.ok)
  const newOnes = results.filter((r) => r.isNew)
  const touchedTools = [...new Set(changed.map((r) => r.tool.id))]

  // ── how far the observations line up with what the dataset currently says ──
  const disagreements = []
  for (const tool of TOOLS) {
    const obs = observations[tool.id]
    if (!obs) continue
    for (const [field, o] of Object.entries(obs.fields)) {
      if (o.informational) continue
      if (o.confidence !== 'high' && o.confidence !== 'conflicted') continue
      const current = tool.fields?.[field]?.value
      if (current && current !== o.suggested) {
        disagreements.push({ tool: tool.id, field, dataset: current, observed: o.suggested, confidence: o.confidence })
      }
    }
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ observations, changed: changed.map((r) => r.key), errors: errors.map((r) => ({ url: r.entry.url, status: r.entry.status, error: r.entry.error })), disagreements }, null, 2))
  } else {
    say('\n─────────────────────────────────────────────')
    say(`unchanged        ${results.length - changed.length - errors.length - newOnes.length}`)
    say(`changed          ${changed.length}`)
    say(`new (baseline)   ${newOnes.length}`)
    say(`fetch errors     ${errors.length}`)

    say('\nwhat the pages appear to say (suggestions only — not verified):')
    for (const tool of TOOLS) {
      const obs = observations[tool.id]
      if (!obs) continue
      const parts = Object.entries(obs.fields)
        .map(([f, o]) =>
          o.informational ? `${f}=(${o.observed.join('/')}, informational)` : `${f}=${o.suggested}${o.confidence === 'conflicted' ? '(!)' : ''}`
        )
        .join('  ')
      say(`  ${tool.id.padEnd(14)} ${parts}`)
    }

    if (disagreements.length) {
      say('\nobserved language disagrees with the current dataset (a person decides):')
      for (const d of disagreements) {
        say(`  ${d.tool.padEnd(14)} ${d.field.padEnd(16)} dataset=${d.dataset.padEnd(22)} observed=${d.observed} (${d.confidence})`)
      }
    }

    // This line is parsed by .github/workflows/policy-hash-check.yml. Keep it.
    say(`\ntools needing a re-read + human review: ${touchedTools.length ? touchedTools.join(', ') : 'none'}`)
  }

  if (SAVE && FIXTURES) {
    say('\n(--save ignored: a fixture run must never overwrite real observations)')
  } else if (SAVE) {
    const next = {
      _meta: {
        schema: 2,
        created: baseline._meta?.created ?? new Date().toISOString(),
        last_run: new Date().toISOString(),
        note:
          'Observations recorded by a script. `signals` are pattern matches, not findings. ' +
          'Nothing here sets verification — only a person reading the page does that.',
      },
      sources: { ...baseline.sources },
      observations,
    }
    for (const r of results) {
      if (!r.entry.ok) {
        // Keep the previous good observation, but record that this run failed.
        next.sources[r.key] = {
          ...(r.before ?? {}),
          url: r.entry.url,
          last_failure: { at: r.entry.checked_at, status: r.entry.status, error: r.entry.error },
        }
        continue
      }
      const { _excerpts, ...safe } = r.entry
      next.sources[r.key] = safe
    }
    await mkdir(dirname(HASH_FILE), { recursive: true })
    await writeFile(HASH_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    say(`\nwrote ${HASH_FILE}`)

    if (EXCERPTS) {
      const bundle = {}
      for (const r of results) if (r.entry._excerpts?.length) bundle[r.key] = r.entry._excerpts
      await mkdir(dirname(EXCERPT_FILE), { recursive: true })
      await writeFile(EXCERPT_FILE, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')
      say(`wrote ${EXCERPT_FILE}  (gitignored — local review aid, never commit it)`)
    }
  } else {
    say('\n(nothing recorded — re-run with --save to update the baseline)')
  }

  if (STRICT && errors.length) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
