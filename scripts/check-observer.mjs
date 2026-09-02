/**
 * check-observer.mjs — proves the policy observer tells the truth about what
 * it can and cannot conclude.
 *
 * The danger with a bot that reads policies is not that it fails; it is that it
 * succeeds confidently. So the assertions here are mostly about restraint:
 *
 *   - conflicting language is reported as a conflict, never resolved
 *   - a field with no enum (residency) gets observations, never a value
 *   - a page that says nothing relevant produces 'none', not a guess
 *   - a fixture run is flagged and refuses to overwrite real observations
 *
 * Runs against saved pages in test/fixtures/policy-pages — no network, so this
 * check passes in CI and on a plane.
 */

import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectField, detectAll } from '../src/lib/policy-patterns.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = 'test/fixtures/policy-pages'

let failed = 0
const check = (label, pass, detail = '') => {
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${pass ? '' : `\n      ${detail}`}`)
}

function run(args) {
  const r = spawnSync(process.execPath, [resolve(ROOT, 'scripts/check-policy-hashes.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return { out: `${r.stdout ?? ''}${r.stderr ?? ''}`, code: r.status }
}

// ── unit level: what one page implies ───────────────────────────────────────
const nothing = detectField('trains_on_data', 'Our offices are in Lisbon. We also sell umbrellas.')
check("a page that says nothing yields 'none', not a guess", nothing.confidence === 'none' && nothing.suggested === null, JSON.stringify(nothing))

const clean = detectField('retention', 'we retain deleted conversations for up to 30 days and data is deleted within thirty days')
check('two agreeing patterns give high confidence', clean.confidence === 'high' && clean.suggested === 'short', JSON.stringify(clean))

const conflict = detectField(
  'trains_on_data',
  'we may use your content to improve our models, and you can opt out of training in your settings'
)
check('conflicting language is flagged, not resolved', conflict.conflicted === true, JSON.stringify(conflict))

const empty = detectAll('')
check('empty text yields no suggestions at all', Object.values(empty).every((f) => f.confidence === 'none'))

// ── integration level: the whole run ────────────────────────────────────────
const json = run(['--only=chatgpt', `--fixtures=${FIXTURES}`, '--json'])
let report
try {
  report = JSON.parse(json.out.slice(json.out.indexOf('{')))
} catch {
  report = null
}
check('the observer runs against saved pages and returns JSON', report !== null, json.out.slice(0, 400))

if (report) {
  const obs = report.observations?.chatgpt?.fields ?? {}

  check('observations are recorded for the tool', Object.keys(obs).length > 0, JSON.stringify(Object.keys(obs)))
  check('a clear signal is reported with confidence', obs.retention?.suggested === 'short' && obs.retention?.confidence === 'high', JSON.stringify(obs.retention))
  check('deletion self-service is detected', obs.deletion?.suggested === 'self-serve', JSON.stringify(obs.deletion))
  check('conditional human review is detected', obs.human_review?.suggested === 'conditional', JSON.stringify(obs.human_review))
  check(
    'mixed training language is reported as conflicted',
    obs.trains_on_data?.confidence === 'conflicted',
    JSON.stringify(obs.trains_on_data)
  )
  check(
    'residency gets observations but never a proposed value',
    obs.residency?.informational === true && obs.residency?.suggested === undefined,
    JSON.stringify(obs.residency)
  )
  check(
    'the run flags where observed language disagrees with the dataset',
    Array.isArray(report.disagreements) && report.disagreements.some((d) => d.tool === 'chatgpt' && d.field === 'retention'),
    JSON.stringify(report.disagreements)
  )
}

// ── restraint: a fixture run must never overwrite real observations ─────────
const saved = run(['--only=chatgpt', `--fixtures=${FIXTURES}`, '--save'])
check('a fixture run refuses to write the real baseline', /--save ignored/.test(saved.out), saved.out.slice(-300))

console.log(`\n${failed ? `${failed} observer check(s) FAILED` : 'policy observer behaves honestly'}`)
process.exit(failed ? 1 : 0)
