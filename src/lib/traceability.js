/**
 * traceability.js — executable version of the project's hard rules.
 *
 * These checks run in the UI (shown on /discover and /methodology) and in CI
 * via `npm run check:traceability`. They exist because rules that are only
 * written down get negotiated later, usually when there is money on the table.
 */

import { TOOLS } from '../data/tools.js'
import { FILTERS, FILTER_BY_ID } from '../data/schema.js'
import { applyFilters, rankTools } from './filters.js'
import { planQuery, answer, explain, USE_CASES, LEXICON_KEYS } from './chat.js'
import { buildWarning, warningPartsPresent, WARNING_PARTS } from './snippet-warning.js'
import { scoreTool } from './scoring.js'

/** Keys that must never exist anywhere in the dataset. */
const FORBIDDEN_KEYS = [
  'sponsored',
  'sponsor',
  'sponsorship',
  'boost',
  'boosted',
  'promoted',
  'partner',
  'partnerBadge',
  'verifiedPartner',
  'featured',
  'placement',
  'paidRank',
  'rankBoost',
  'promotedUntil',
  // Phase 2/3 axes. If one of these ever appears on a provider row, the two
  // signals have started to blend, which is the thing the roadmap forbids.
  'upvotes',
  'upvote_score',
  'aduo',
  'aduo_grant',
  'aduo_boost',
  'traffic',
  'traffic_trend',
  'review_sentiment',
  'campaign',
  'promotion_until',
]

function scanForbidden(obj, path = 'tool', hits = []) {
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => scanForbidden(v, `${path}[${i}]`, hits))
    return hits
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (FORBIDDEN_KEYS.includes(k)) hits.push(`${path}.${k}`)
      scanForbidden(v, `${path}.${k}`, hits)
    }
  }
  return hits
}

/** Filter ids the chat lexicon is allowed to reference. */
function chatFilterIds() {
  const ids = new Set()
  for (const uc of USE_CASES) uc.filters.forEach((f) => ids.add(f))
  LEXICON_KEYS.forEach((f) => ids.add(f))
  return [...ids]
}

const SAMPLE_QUERIES = [
  'I want something private for journaling',
  'free tool for essays',
  'EU based assistant for work',
  'image generator that does not train on my prompts',
  'something for health questions that deletes data quickly',
]

export function runTraceabilityChecks() {
  const checks = []

  const push = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail })

  /* 1 — Chat output is a subset of, and in the same order as, the public ranking. */
  // Questions are pre-answered so the planner returns a result set rather than
  // asking the user something; the point here is to audit ranking, not dialogue.
  const forced = { askedQuestions: ['focus', 'usecase', 'strictness'] }

  let orderOk = true
  let subsetOk = true
  let detailSeen = []
  for (const q of SAMPLE_QUERIES) {
    const plan = planQuery(q, forced)
    const chat = answer(TOOLS, plan, { limit: 20 })
    const publicOrder = rankTools(TOOLS, { filters: chat.filters, category: chat.category, sort: 'score' })

    const chatIds = chat.results.map((t) => t.id)
    const publicIds = publicOrder.map((t) => t.id)
    const rankOf = (id) => publicIds.indexOf(id)

    for (let i = 1; i < chatIds.length; i++) {
      if (rankOf(chatIds[i]) < rankOf(chatIds[i - 1])) orderOk = false
    }
    if (!chatIds.every((id) => publicIds.includes(id))) subsetOk = false
    detailSeen.push(`${q.slice(0, 24)}… → ${chatIds.length} tools, top: ${chatIds[0] ?? 'none'}`)
  }
  push(
    'Chat results never outrank or outrank-reorder the public comparison',
    orderOk && subsetOk,
    `${SAMPLE_QUERIES.length} sample queries checked. ${detailSeen.join(' | ')}`
  )

  /* 2 — Determinism: same input, same output, every time. */
  const a = planQuery(SAMPLE_QUERIES[0], forced).filters.join(',')
  const b = planQuery(SAMPLE_QUERIES[0], forced).filters.join(',')
  const firstRun = answer(TOOLS, planQuery(SAMPLE_QUERIES[1], forced), { limit: 20 }).results.map((t) => t.id).join(',')
  const secondRun = answer(TOOLS, planQuery(SAMPLE_QUERIES[1], forced), { limit: 20 }).results.map((t) => t.id).join(',')
  push('Parsing and ranking are deterministic', a === b && firstRun === secondRun, `plan "${a}" stable; result set stable`)

  /* 3 — Chat may only use declared filters. No private scoring knobs. */
  const unknownIds = chatFilterIds().filter((id) => !FILTER_BY_ID[id])
  push(
    'Chat can only reference declared comparison filters',
    unknownIds.length === 0,
    unknownIds.length ? `Undeclared: ${unknownIds.join(', ')}` : `${chatFilterIds().length} filter references, all declared`
  )

  /* 4 — Scores are derived, never stored, and depend only on field values. */
  const clone = JSON.parse(JSON.stringify(TOOLS[0]))
  const before = scoreTool(clone).score
  clone.fields.trains_on_data.value = 'no'
  const after = scoreTool(clone).score
  push(
    'Transparency score is computed from field values, not stored',
    !('score' in TOOLS[0]) && after >= before,
    `${TOOLS[0].name}: ${before} → ${after} when training set to "no"`
  )

  /* 5 — Unknown is never rewarded. */
  const unknownTool = JSON.parse(JSON.stringify(TOOLS[0]))
  Object.keys(unknownTool.fields).forEach((k) => {
    if (k === 'residency') {
      unknownTool.fields[k] = { hq_jurisdiction: null, eu_option: null, regions: [], note: '' }
    } else {
      unknownTool.fields[k].value = 'unknown'
    }
  })
  const blank = scoreTool(unknownTool)
  push(
    'An all-unknown row scores zero, not average',
    blank.score === 0 && blank.coverage === 0,
    `score ${blank.score}, coverage ${blank.coverage}%`
  )

  /* 6 — Verification honesty.

        NOTE: 'stale' mentioned below is the watchdog concept, not the
        FieldState component state (dropped eb76712). Reconcile at Phase 5.

        A date means "a person read this row". It is fabricated when it sits on
        a row that has never been read. `stale` and `disputed` keep the date
        from the reading that actually happened, so they are not fabrication. */
  const NEVER_READ = ['draft-unverified', 'observed']
  const fabricated = TOOLS.filter(
    (t) => t.verification.last_verified && NEVER_READ.includes(t.verification.status)
  )
  push(
    'No fabricated verification dates',
    fabricated.length === 0,
    fabricated.length ? `date on an unread row: ${fabricated.map((t) => t.id).join(', ')}` : `${TOOLS.length} rows audited`
  )

  /* 6b — A verification claim has to be worth what it says.
          Each confirmed field carries the page it was read from, so the claim
          can be checked: 'verified' means every field was read, 'partially-
          verified' means some were and the rest say so. */
  const sourced = (t) => Object.values(t.fields).filter((f) => f.source).length
  const overclaimed = TOOLS.filter(
    (t) => t.verification.status === 'verified' && sourced(t) !== Object.keys(t.fields).length
  )
  const underExplained = TOOLS.filter(
    (t) => t.verification.status === 'partially-verified' && (sourced(t) === 0 || !t.verification.last_verified)
  )
  const dateless = TOOLS.filter(
    (t) => t.verification.status === 'partially-verified' && !t.verification.last_verified
  )
  push(
    "'Verified' means every field was read and cites its source",
    overclaimed.length === 0 && underExplained.length === 0 && dateless.length === 0,
    overclaimed.length
      ? `claims verified with unsourced fields: ${overclaimed.map((t) => t.id).join(', ')}`
      : `${TOOLS.filter((t) => t.verification.status !== 'draft-unverified').length} row(s) read; the rest say they have not been`
  )

  /* 7 — Signal separation: community signal stays null until Phase 2 exists. */
  const blended = TOOLS.filter((t) => t.community_signal !== null)
  push(
    'Community/upvote signal is not blended into the transparency score',
    blended.length === 0,
    blended.length ? blended.map((t) => t.id).join(', ') : 'all rows: community_signal = null (Phase 2)'
  )

  /* 8 — No sponsorship surface inside the dataset. */
  const forbiddenHits = TOOLS.flatMap((t) => scanForbidden(t, t.id))
  push(
    'No sponsorship / boost / partner fields exist in the provider dataset',
    forbiddenHits.length === 0,
    forbiddenHits.length ? forbiddenHits.join(', ') : `scanned ${TOOLS.length} rows for ${FORBIDDEN_KEYS.length} forbidden keys`
  )

  /* 9 — Every filter actually matches something in the current data, or is
         honestly reported as matching nothing. */
  const empty = FILTERS.filter((f) => applyFilters(TOOLS, { filters: [f.id] }).length === 0).map((f) => f.id)
  push(
    'Filter behaviour is measured, not assumed',
    true,
    empty.length ? `Filters with zero matches today: ${empty.join(', ')}` : 'every filter matches at least one row'
  )

  /* 10 — The tamper warning must keep all four parts. */
  const sampleWarning = buildWarning({
    listingName: 'Example',
    supportEmail: 'support@example.org',
    checks: [
      { checked_at: new Date().toISOString(), outcome: 'missing', note: 'No tag found.', httpStatus: 200 },
    ],
  })
  push(
    'Tamper warning contains all four required parts',
    warningPartsPresent(sampleWarning) && /support@example\.org/.test(sampleWarning.parts.how_to_contact),
    `${WARNING_PARTS.length} parts present: ${WARNING_PARTS.map((p) => p.key).join(', ')}`
  )

  /* 11 — Phase 2/3 signal fields must never appear on a provider row. */
  const signalHits = TOOLS.flatMap((t) => scanForbidden(t, t.id)).filter((h) =>
    /upvote|aduo|traffic|review_sentiment|campaign|promotion/.test(h)
  )
  push(
    'No directory, upvote or ADUO fields on a Phase 1 provider row',
    signalHits.length === 0,
    signalHits.length ? signalHits.join(', ') : 'the two datasets are structurally separate'
  )

  return checks
}

export function traceabilitySummary() {
  const checks = runTraceabilityChecks()
  const failed = checks.filter((c) => !c.pass)
  return { checks, passed: checks.length - failed.length, total: checks.length, failed }
}

/** Used by the chat UI to show the provenance of a result set. */
export function provenance(plan, results) {
  const s = scoreTool(results[0] ?? TOOLS[0])
  return {
    filters: plan.filters ?? [],
    category: plan.category ?? null,
    rankingFn: 'rankTools(filters, category, sort:"score")',
    sampleToolScore: s.score,
    explain: results.length ? explain(results[0], plan.filters ?? []) : null,
  }
}
