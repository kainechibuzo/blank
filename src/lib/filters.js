/**
 * filters.js — one ranking implementation, used everywhere.
 *
 * The comparison page and the chat discovery flow both call `rankTools`.
 * That is not tidiness for its own sake: it is how the Phase 3 hard rule is
 * enforced in code. Chat output is a filtered view of this function's output,
 * so it cannot drift into a second, unaccountable ranking.
 */

import { FILTER_BY_ID, SORTS } from '../data/schema.js'
import { scoreTool } from './scoring.js'

export function applyFilters(tools, { filters = [], category = null } = {}) {
  const active = filters.filter((id) => FILTER_BY_ID[id])
  const categories = Array.isArray(category) ? category : category ? [category] : []

  return tools.filter((tool) => {
    if (categories.length && !categories.includes(tool.category)) return false
    return active.every((id) => FILTER_BY_ID[id].matches(tool))
  })
}

export function sortTools(tools, sort = 'score') {
  const dir = sort.startsWith('-') ? -1 : 1
  const key = sort.replace(/^-/, '')
  const scored = tools.map((t) => ({ t, s: scoreTool(t) }))

  scored.sort((a, b) => {
    switch (key) {
      case 'name':
        return dir * a.t.name.localeCompare(b.t.name)
      case 'coverage':
        return dir * (b.s.coverage - a.s.coverage || b.s.score - a.s.score)
      case 'verified': {
        const av = a.t.verification.last_verified || ''
        const bv = b.t.verification.last_verified || ''
        return dir * (bv.localeCompare(av) || b.s.score - a.s.score)
      }
      case 'score':
      default:
        return dir * (b.s.score - a.s.score || b.s.coverage - a.s.coverage)
    }
  })

  return scored.map((x) => x.t)
}

/** The one ranking entry point. Compare, Discover and the API all use this. */
export function rankTools(tools, { filters = [], category = null, sort = 'score' } = {}) {
  return sortTools(applyFilters(tools, { filters, category }), sort)
}

export const SORT_IDS = SORTS.map((s) => s.id)

/** URL-safe encoding of a view state, so any chat result can be opened as a
 *  public comparison and checked by hand. */
export function encodeState({ filters = [], category = null, sort = 'score' }) {
  const params = new URLSearchParams()
  if (filters.length) params.set('f', filters.join(','))
  if (category) params.set('c', Array.isArray(category) ? category.join(',') : category)
  if (sort && sort !== 'score') params.set('sort', sort)
  return params.toString()
}

export function decodeState(searchParams) {
  const raw = searchParams.get('f')
  const cat = searchParams.get('c')
  const sort = searchParams.get('sort')
  return {
    filters: raw ? raw.split(',').filter((id) => FILTER_BY_ID[id]) : [],
    category: cat ? cat.split(',').filter(Boolean) : null,
    sort: sort && SORT_IDS.includes(sort) ? sort : 'score',
  }
}

/**
 * When a filter combination returns nothing, relax in a fixed priority order
 * and say exactly what was dropped. Never silently return "nothing found",
 * and never quietly substitute a different result set.
 */
const RELAX_ORDER = [
  'enterprise_no_training',
  'free_tier_exists',
  'real_free_tier',
  'self_serve_deletion',
  'eu_based',
  'short_retention',
  'eu_residency',
  'no_human_review',
  'training_opt_out',
  'no_training',
  'verified_only',
]

export function relaxUntilResults(tools, { filters = [], category = null, sort = 'score', limit = 6 }) {
  const original = filters.filter((id) => FILTER_BY_ID[id])
  let remaining = [...original]
  const dropped = []

  for (const id of RELAX_ORDER) {
    const results = rankTools(tools, { filters: remaining, category, sort })
    if (results.length >= 1) {
      return { results: results.slice(0, limit), dropped, remaining, total: results.length }
    }
    if (remaining.includes(id)) {
      remaining = remaining.filter((x) => x !== id)
      dropped.push(id)
    }
  }

  return {
    results: rankTools(tools, { filters: remaining, category, sort }).slice(0, limit),
    dropped,
    remaining,
    total: rankTools(tools, { filters: remaining, category, sort }).length,
  }
}
