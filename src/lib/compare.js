import { FIELD_ORDER, FILTER_BY_ID } from '../data/schema.js'
import { scoreTool } from './scoring.js'
import { groupTools } from './consequence.js'

/**
 * compare.js — the comparison page's view of the data.
 *
 * Filter labels are read straight from schema.js, never restated here. One
 * label per filter, in the factual register, everywhere it appears — the
 * comparison page, the mobile bottom sheet, the chips from "describe what you
 * need", and the chat flow.
 *
 * Third-person and present tense, because a filter is a claim about the tool,
 * not about the reader. "Doesn't train on your data" is something we can be
 * wrong about and be corrected on; "My data isn't used for training" is
 * marketing copy, and it is the reader who pays if it is wrong.
 */
export const COMPARE_FILTERS = [
  'no_training',
  'no_human_review',
  'self_serve_deletion',
  'eu_residency',
  'real_free_tier',
].map((id) => ({ id, label: FILTER_BY_ID[id]?.label ?? id }))

export const COMPARE_FILTER_IDS = COMPARE_FILTERS.map((f) => f.id)

/**
 * The runtime guard.
 *
 * The lexicon behind "describe what you need" knows more filters than this page
 * offers — `free_tier_exists`, `enterprise_no_training`. A filter outside the
 * five cannot be rendered (it has no label here) and must not be applied (the
 * reader would be filtered by something they cannot see or undo).
 *
 * So anything outside the five is dropped here, before chips are built and
 * before the filters reach the query. The reader is not told we ignored part of
 * their wording: it is an edge case, and "we ignored part of your query" is
 * noise for someone who typed "cheap and fast".
 *
 * A runtime guard rather than a build check, because which filters a page
 * offers is a UI decision, not a schema constraint — the schema is right to
 * know about filters this page does not use.
 */
export function retainKnownFilters(ids) {
  return (ids ?? []).filter((id) => COMPARE_FILTER_IDS.includes(id))
}

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
