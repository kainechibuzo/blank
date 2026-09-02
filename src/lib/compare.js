import { FIELD_ORDER } from '../data/schema.js'
import { scoreTool } from './scoring.js'
import { groupTools } from './consequence.js'

/**
 * compare.js — the comparison page's view of the data.
 *
 * Filters are written in the first person here because this is the one screen
 * where someone is answering for themselves: "My data isn't used for training"
 * is a thing you can answer yes or no about yourself, where "Doesn't train on
 * your data" is a thing you have to translate first. Elsewhere the neutral
 * third-person labels stay as they are.
 *
 * The ids are the canonical filter ids from schema.js. Only the labels differ,
 * and "describe what you need" resolves back to those same ids — so a chip
 * derived from free text and a checkbox ticked by hand produce the same query.
 */
export const COMPARE_FILTERS = [
  { id: 'no_training', label: "My data isn't used for training" },
  { id: 'no_human_review', label: 'No human ever reads my chats' },
  { id: 'self_serve_deletion', label: 'I can delete everything' },
  { id: 'eu_residency', label: 'My data stays in Europe' },
  { id: 'real_free_tier', label: 'Free plan has the same rules as paid' },
]

export const COMPARE_FILTER_IDS = COMPARE_FILTERS.map((f) => f.id)

/** "Most recently verified" is deliberately absent: it orders by our workflow,
 *  not by anything a person reading the page is trying to find. */
export const COMPARE_SORTS = [
  { id: 'coverage', label: 'Coverage' },
  { id: 'score', label: 'Score' },
  { id: 'name', label: 'A–Z' },
]

/**
 * Group first, sort second. Always in that order, and the sort never crosses a
 * group boundary.
 *
 * Sorting by score must not be able to promote a NO_REMEDY tool above a
 * SAFE_BY_DEFAULT one. The moment it can, a display preference has quietly
 * become a claim about which tool is better, and that is a claim this site
 * does not make and cannot support.
 *
 * Default is coverage: most-read first, because a score computed from three
 * fields is not comparable to a score computed from seven, and listing them
 * together as if they were is how a half-read row wins.
 */
export function groupAndSort(tools, sort = 'coverage') {
  const { groups, unmapped } = groupTools(tools, { leads: FIELD_ORDER })
  return {
    groups: groups.map((g) => ({ ...g, rows: sortRows(g.tools, sort) })),
    unmapped,
  }
}

/**
 * Sorts assessment rows, not bare tools, so a tool never loses the reason it
 * was grouped where it was.
 */
function sortRows(rows, sort) {
  const scored = new Map(rows.map((r) => [r.tool.id, scoreTool(r.tool)]))
  return [...rows].sort((a, b) => {
    const A = scored.get(a.tool.id)
    const B = scored.get(b.tool.id)
    if (sort === 'name') return a.tool.name.localeCompare(b.tool.name)
    if (sort === 'score') return B.score - A.score || B.coverage - A.coverage
    return B.coverage - A.coverage || B.score - A.score
  })
}
