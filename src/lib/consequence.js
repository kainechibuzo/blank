import { stateForField, STATES } from './field-states.js'
import { sentenceFor, noRemedySentenceFor, showsOffByDefault } from './plain-english.js'

/**
 * consequence.js — which group a tool belongs in, and why.
 *
 * THE WHOLE UX PRINCIPLE IS IN THIS FILE: tools are grouped by what happens to
 * you, never alphabetically and never by score. A list sorted by score is a
 * leaderboard, and a leaderboard answers "which of these is best" — which is
 * not the question, and quietly implies a ranking we do not make.
 *
 * A tool's group is decided by the worst state among the facts that matter for
 * the chosen category. Worst, because a tool that is safe on six counts and
 * trains on everything is not a safe tool.
 */

/** Severity, worst last. NOT_READ_YET is handled separately, not ranked. */
const SEVERITY = {
  SAFE_BY_DEFAULT: 0,
  UNKNOWN: 1,
  OPT_OUT_EXISTS: 2,
  NO_REMEDY: 3,
}

/**
 * The six display groups, in canonical order.
 *
 * This order is fixed and applies to every screen that groups tools — the
 * result screen and the full comparison alike. Documented in
 * docs/field-states.md. Sorting reorders WITHIN a group and never across one:
 * a person sorting by score must not be able to promote a NO_REMEDY tool above
 * a SAFE_BY_DEFAULT one, because that would turn a display preference into a
 * claim about which tool is better.
 *
 * Two of these were not in the brief. `know` exists because the state matrix
 * routes informational values to OPT_OUT_EXISTS, which is right at the value
 * layer and wrong at the grouping layer. `unread` exists because fourteen of
 * twenty rows have never been read, and filing them under `unclear` would
 * blame a provider for our own unfinished work.
 */
export const GROUPS = [
  {
    id: 'safe',
    heading: 'Safe by default',
    sub: 'Nothing you need to do.',
  },
  {
    id: 'know',
    // Exact string, per the ruling. Not "Informational", not "FYI": someone
    // scanning fast understands this without reading the body copy.
    heading: 'Worth knowing — nothing to switch off',
    sub: 'Not a problem you can fix in settings. Something to know before you paste.',
  },
  {
    id: 'opt-out',
    heading: "Opt-out available — it's off by default though",
    sub: 'You can make these safer. You have to do it yourself.',
  },
  {
    id: 'no-remedy',
    heading: 'No remedy on this plan',
    sub: 'We read the policy. The answer is bad, and no setting fixes it.',
  },
  {
    id: 'unclear',
    heading: "Their policy doesn't answer this",
    sub: 'We read it. This is a gap in their policy, not in ours.',
  },
  {
    id: 'unread',
    heading: "We haven't read this yet",
    // Exact string, per the ruling, and load-bearing: it is the entire reason
    // coverage exists as a metric. A row we have not read is not a row with
    // bad answers, and the interface must never let it be read as one.
    sub: "We haven't read these yet. No values are assumed.",
  },
]

const GROUP_BY_STATE = {
  SAFE_BY_DEFAULT: 'safe',
  OPT_OUT_EXISTS: 'opt-out',
  NO_REMEDY: 'no-remedy',
  UNKNOWN: 'unclear',
}

/**
 * Whether a person can actually DO anything about an OPT_OUT_EXISTS fact.
 *
 * The signed-off state matrix maps several merely-informational values to
 * OPT_OUT_EXISTS — `retention: stated`, `free_tier: differs`, the enterprise
 * tiers. Those are things to know, not things to switch. Putting them under
 * the heading "Opt-out available — it's off by default though" tells someone
 * there is a setting, and for these there is not.
 *
 * This keeps the state contract intact and fixes the claim at the grouping
 * layer, which is where the promise is actually made.
 */
const ACTIONABLE = {
  trains_on_data: ['opt-out-available'],
  human_review: [], // no value here offers a switch; review is not optional
  deletion: ['request', 'partial'], // you can ask, even if the answer is no
  retention: [],
  free_tier: [],
  enterprise_api: [],
}

function isActionable(key, value) {
  return (ACTIONABLE[key] ?? []).includes(value)
}

/**
 * Work out one tool's group, the sentence that explains it, and the field that
 * decided it — for one category.
 *
 * Returns `{ group, sentence, key, state, offByDefault, unmapped }`.
 * `unmapped` is non-empty when stateForField could not say what a value means;
 * the caller shouts rather than filing it under something.
 */
export function assess(tool, category) {
  const leads = category?.leads ?? []
  const unmapped = []
  const seen = []

  for (const key of leads) {
    const field = tool.fields?.[key]
    const state = stateForField(key, field)
    if (state === null) {
      // A value we cannot map. Recorded and returned, never coerced — an
      // unmapped value rendered as "their policy doesn't say" would blame the
      // provider for a gap in our schema.
      unmapped.push(`${tool.id}.${key}=${String(field?.value)}`)
      continue
    }
    seen.push({ key, state, field })
  }

  const read = seen.filter((s) => s.state !== 'NOT_READ_YET')

  if (read.length === 0) {
    return {
      group: 'unread',
      sentence: "We haven't read their policy yet.",
      key: null,
      state: 'NOT_READ_YET',
      offByDefault: false,
      unmapped,
    }
  }

  // Worst wins. Ties go to the earlier lead field, which is the one the
  // category says matters more.
  const worst = read.reduce((a, b) => ((SEVERITY[b.state] ?? 0) > (SEVERITY[a.state] ?? 0) ? b : a))

  const sentence =
    worst.state === 'NO_REMEDY'
      ? noRemedySentenceFor(worst.key, worst.field?.value)
      : sentenceFor(worst.key, worst.state, worst.field?.value)

  // OPT_OUT_EXISTS with nothing to switch is a fact, not a task. It gets its
  // own group so the heading above it does not promise a setting.
  const group =
    worst.state === 'OPT_OUT_EXISTS' && !isActionable(worst.key, worst.field?.value)
      ? 'know'
      : (GROUP_BY_STATE[worst.state] ?? 'unclear')

  return {
    group,
    sentence: sentence ?? STATES[worst.state]?.blurb ?? null,
    key: worst.key,
    state: worst.state,
    // Asked, not decided here: the condition lives in plain-english.js so no
    // component can grow a second, different version of it.
    offByDefault: showsOffByDefault(worst.key, worst.state, worst.field?.value),
    unmapped,
  }
}

/**
 * Sort every tool into its group for one category.
 *
 * Returns the groups in display order, each with its tools. Tools inside a
 * group keep the dataset's order — deliberately not sorted by name and not
 * sorted by score, because either would imply a ranking.
 */
export function groupTools(tools, category) {
  const buckets = new Map(GROUPS.map((g) => [g.id, []]))
  const unmapped = []

  for (const tool of tools) {
    const result = assess(tool, category)
    unmapped.push(...result.unmapped)
    buckets.get(result.group)?.push({ tool, ...result })
  }

  return {
    groups: GROUPS.map((g) => ({ ...g, tools: buckets.get(g.id) ?? [] })),
    unmapped,
  }
}
