/**
 * scoring.js — turns eight tracked facts into one number, and never pretends
 * that number is more than it is.
 *
 * Two numbers are always shown together, and they mean different things:
 *   • Transparency score (0–100): how good the answers are, where known.
 *   • Coverage (%): how much of the row is actually answered.
 *
 * Unknown fields score zero, so a blank row cannot look good — but unknown is
 * also not treated as "bad", because a provider being silent is not the same
 * as a provider doing something wrong. Coverage is what tells you which
 * situation you are in.
 */

import { FIELDS, FIELD_ORDER } from '../data/schema.js'

export const POINTS = {
  trains_on_data: { no: 25, 'opt-in-only': 25, 'opt-out-available': 14, yes: 0, unknown: 0 },
  human_review: { no: 20, conditional: 10, yes: 0, unknown: 0 },
  deletion: { 'self-serve': 15, request: 9, partial: 5, none: 0, unknown: 0 },
  retention: { ephemeral: 15, short: 12, stated: 7, indefinite: 0, unknown: 0 },
  free_tier: { 'same-policy': 10, differs: 4, 'no-free-tier': 4, unknown: 0 },
  enterprise_api: {
    'separate-no-training': 5,
    separate: 3,
    same: 3,
    none: 2,
    unknown: 0,
  },
}

export const MAX = {
  trains_on_data: 25,
  human_review: 20,
  deletion: 15,
  retention: 15,
  residency: 10,
  free_tier: 10,
  enterprise_api: 5,
}

const MAX_TOTAL = Object.values(MAX).reduce((a, b) => a + b, 0)

/** Residency carries structure rather than a single enum, so it scores by hand. */
function residencyPoints(residency) {
  if (!residency) return 0
  if (residency.eu_option === true) return MAX.residency
  if (Array.isArray(residency.regions) && residency.regions.length > 0) return 4
  return 0
}

function isAnswered(fieldKey, field) {
  if (fieldKey === 'residency') {
    return Boolean(field.hq_jurisdiction) && Array.isArray(field.regions) && field.regions.length > 0
  }
  return Boolean(field.value) && field.value !== 'unknown'
}

/**
 * @returns {{score:number, coverage:number, answered:number, total:number,
 *            breakdown:Array, unknowns:string[]}}
 */
export function scoreTool(tool) {
  const breakdown = []
  const unknowns = []
  let score = 0
  let answered = 0

  for (const key of FIELD_ORDER) {
    const field = tool.fields[key]
    const max = MAX[key]
    let points = 0
    let value = null

    if (key === 'residency') {
      points = residencyPoints(field)
      value = field.hq_jurisdiction
    } else {
      value = field.value
      points = POINTS[key]?.[value] ?? 0
    }

    const answeredNow = isAnswered(key, field)
    if (answeredNow) answered += 1
    else unknowns.push(key)

    score += points
    breakdown.push({
      key,
      label: FIELDS[key].label,
      value,
      points,
      max,
      answered: answeredNow,
      tone: answeredNow ? (FIELDS[key].options[value]?.tone ?? 'mixed') : 'unknown',
    })
  }

  return {
    score,
    max: MAX_TOTAL,
    coverage: Math.round((answered / FIELD_ORDER.length) * 100),
    answered,
    total: FIELD_ORDER.length,
    breakdown,
    unknowns,
  }
}

export const SCORE_BANDS = [
  { min: 75, label: 'Strong', tone: 'good' },
  { min: 55, label: 'Mixed', tone: 'mixed' },
  { min: 0, label: 'Weak', tone: 'bad' },
]

export function band(score) {
  return SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]
}
