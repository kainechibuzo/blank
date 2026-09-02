/**
 * field-states.js — the five states one policy fact can be in, and how to get
 * from a stored value to a state.
 *
 * FIVE STATES. Four colours, because NO_REMEDY gets one of its own:
 *
 *   green    safe by default
 *   yellow   action required — you can make it safer, but you have to act
 *   orange   no remedy — we read it, the answer is bad, no setting fixes it
 *   grey     unknown or unread
 *
 * There is deliberately no red. A provider being silent is not the same as a
 * provider doing something wrong, and a provider doing something wrong is not
 * a claim of bad faith we are able to make. Orange is the ceiling, and it
 * states only what the page stated.
 *
 * READ THE STATES IN THIS ORDER:
 *
 *   SAFE_BY_DEFAULT   no action needed
 *   OPT_OUT_EXISTS    possible, but off by default — you have to act
 *   NO_REMEDY         we read the page. The answer is bad. There is no opt-out
 *                     on this plan. Orange, and the only orange in the system.
 *   UNKNOWN           we read the page; it does not address this. A real
 *                     answer, not a gap. "Their policy doesn't say."
 *   NOT_READ_YET      no fetch has happened. Visually distinct from UNKNOWN
 *                     because "they don't say" and "we didn't look" are
 *                     different facts about different people.
 *
 * STALE was here once and is gone. It was unreachable — nothing in the
 * codebase could set it, so it existed only on the test page. A state that
 * only a test page can reach is not a state. It returns in its own commit when
 * something can actually set it.
 */

export const STATES = {
  SAFE_BY_DEFAULT: {
    id: 'SAFE_BY_DEFAULT',
    icon: '●',
    tone: 'good',
    label: 'Safe by default',
    blurb: 'No action needed.',
    aria: 'Safe by default',
  },
  OPT_OUT_EXISTS: {
    id: 'OPT_OUT_EXISTS',
    icon: '◐',
    tone: 'mixed',
    label: 'You can make it safer',
    blurb: "It's off by default — you have to turn it on yourself.",
    aria: 'Action required: a safer setting exists but is off by default',
  },
  NO_REMEDY: {
    id: 'NO_REMEDY',
    icon: '✕',
    tone: 'noremedy',
    label: 'No remedy on this plan',
    blurb: 'We read the page. The answer is bad. There is no opt-out on this plan.',
    aria: 'No remedy available on this plan',
  },
  UNKNOWN: {
    id: 'UNKNOWN',
    icon: '○',
    tone: 'unknown',
    label: "Their policy doesn't say",
    blurb: 'We read it. This is not a gap in our work — it is a gap in theirs.',
    aria: 'Unknown: the policy was read and does not address this',
  },
  NOT_READ_YET: {
    id: 'NOT_READ_YET',
    icon: '▢',
    tone: 'unknown',
    label: "We haven't read this yet",
    blurb: 'No source has been read for this field.',
    aria: 'Not read yet',
  },
}

/**
 * The exact words for each value that lands in NO_REMEDY.
 *
 * These are not generated from the value name and must not be paraphrased by
 * any component: "deletion: none" becoming "no deletion route exists" would be
 * a softer claim than the one the policy supports.
 */
const NO_REMEDY_COPY = {
  trains_on_data: {
    yes: 'This tool trains on your chats. There is no opt-out on this plan.',
  },
  human_review: {
    yes: 'Humans can read your conversations. There is no opt-out on this plan.',
  },
  retention: {
    indefinite: 'They do not say when or whether they delete your data.',
  },
  deletion: {
    none: 'You cannot delete your data on this plan.',
  },
}

/** The sentence for a value with no remedy, or null if it has none. */
export function noRemedyCopy(key, value) {
  return NO_REMEDY_COPY[key]?.[value] ?? null
}

/**
 * value → state, per field.
 *
 * `undefined` means the value has no mapping yet — which is a bug to be found,
 * not a state to be rendered. Every value in the schema is mapped.
 */
const MAP = {
  trains_on_data: {
    no: 'SAFE_BY_DEFAULT',
    'opt-in-only': 'SAFE_BY_DEFAULT',
    'opt-out-available': 'OPT_OUT_EXISTS',
    yes: 'NO_REMEDY',
    unknown: 'UNKNOWN',
  },
  human_review: {
    no: 'SAFE_BY_DEFAULT',
    conditional: 'OPT_OUT_EXISTS',
    yes: 'NO_REMEDY',
    unknown: 'UNKNOWN',
  },
  retention: {
    ephemeral: 'SAFE_BY_DEFAULT',
    short: 'SAFE_BY_DEFAULT',
    stated: 'OPT_OUT_EXISTS',
    indefinite: 'NO_REMEDY',
    unknown: 'UNKNOWN',
  },
  deletion: {
    'self-serve': 'SAFE_BY_DEFAULT',
    request: 'OPT_OUT_EXISTS',
    partial: 'OPT_OUT_EXISTS',
    none: 'NO_REMEDY',
    unknown: 'UNKNOWN',
  },
  free_tier: {
    'same-policy': 'SAFE_BY_DEFAULT',
    differs: 'OPT_OUT_EXISTS',
    'no-free-tier': 'OPT_OUT_EXISTS',
    unknown: 'UNKNOWN',
  },
  enterprise_api: {
    'separate-no-training': 'SAFE_BY_DEFAULT',
    separate: 'OPT_OUT_EXISTS',
    same: 'OPT_OUT_EXISTS',
    none: 'OPT_OUT_EXISTS',
    unknown: 'UNKNOWN',
  },
}

/**
 * The state of one field on one tool.
 *
 * NOT_READ_YET wins over everything: a value with no source has not been read,
 * whatever it says. Everything else comes from the value.
 *
 * Returns null for a value that is present but has no mapping. That is a bug,
 * not a state, and it must not fall through to UNKNOWN — an unmapped value
 * rendered as "their policy doesn't say" would be us filing a finding we do
 * not hold. Callers surface it; the check suite refuses to let it build.
 */
export function stateForField(key, field) {
  if (!field) return 'NOT_READ_YET'
  if (!field.source) return 'NOT_READ_YET'

  if (key === 'residency') {
    const answered = Boolean(field.hq_jurisdiction) && Array.isArray(field.regions) && field.regions.length
    return answered ? 'SAFE_BY_DEFAULT' : 'UNKNOWN'
  }

  // A field whose value is missing entirely has not been read, whatever the
  // presence of a source implies.
  if (!field.value) return 'NOT_READ_YET'

  return MAP[key]?.[field.value] ?? null
}

/** Every state, in the order they should be presented. */
export const STATE_ORDER = [
  'SAFE_BY_DEFAULT',
  'OPT_OUT_EXISTS',
  'NO_REMEDY',
  'UNKNOWN',
  'NOT_READ_YET',
]
