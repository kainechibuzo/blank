import { FIELD_ORDER } from '../data/schema.js'
import { sortTools } from './filters.js'
import { groupTools } from './consequence.js'

/**
 * compare.js — the comparison page's view of the data.
 *
 * Filters are written in the first person here because this is the one screen
 * where someone is answering for themselves: "My data isn't used for training"
 * is a thing you can answer yes or no about yourself, where "Doesn't train on
 * your data" is a thing you have to translate first. Elsewhere in the site the
 * neutral third-person labels stay as they are.
 *
 * The ids are the canonical filter ids from schema.js. Only the labels differ,
 * and the chips in "describe what you need" resolve back to those same ids —
 * so a chip derived from free text and a checkbox ticked by hand produce the
 * same query.
 */
export const COMPARE_FILTERS = [
  { id: 'no_training', label: "My data isn't used for training" },
  { id: 'no_human_review', label: 'No human ever reads my chats' },
  { id: 'self_serve_deletion', label: 'I can delete everything' },
  { id: 'eu_residency', label: 'My data stays in Europe' },
  { id: 'real_free_tier', label: 'Free plan has the same rules as paid' },
]

export const COMPARE_FILTER_IDS = COMPARE_FILTERS.map((f) => f.id)

/** The three sorts this page offers. `verified` is not one of them: "most
 *  recently verified" orders by our workflow, not by anything a reader wants. */
export const COMPARE_SORTS = [
  { id: 'score', label: 'Score' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'name', label: 'A–Z' },
]

/**
 * Group first, sort second. Always in that order.
 *
 * The sort control reorders WITHIN a group and never across one. Sorting by
 * score must not promote a NO_REMEDY tool above a SAFE_BY_DEFAULT tool,
 * because the moment it can, a display preference has become a claim about
 * which tool is better — and that claim is not one this site makes.
 *
 * Within a group: coverage fraction descending (most-read first), then score
 * descending as the tiebreaker. Most-read first, because a score computed from
 * three fields is not comparable to a score computed from seven.
 */
export function groupAndSort(tools, sort = 'score') {
  const ALL_FIELDS = { leads: FIELD_ORDER }
  const { groups, unmapped } = groupTools(tools, ALL_FIELDS)

  return {
    groups: groups.map((g) => ({ ...g, tools: sortTools(g.tools.map((x) => x.tool), 'coverage') })),
    // Sorting by the chosen key is applied inside each group, after the
    // coverage ordering has already put fully-read rows first.
    sorted: groups.map((g) => ({
      ...g,
      tools: sortInternal(g.tools, sort),
    })),
    unmapped,
  }
}

function sortInternal(rows, sort) {
  const tools = rows.map((x) => x.tool)
  const ordered = sortTools(tools, sort)
  // sortTools returns bare tools; re-attach the assessment that grouped them.
  const byId = new Map(rows.map((r) => [r.tool.id, r]))
  return ordered.map((t) => byId.get(t.id)).filter(Boolean)
}
