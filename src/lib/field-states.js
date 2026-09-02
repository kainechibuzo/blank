/**
 * field-states.js — the five states one policy fact can be in, and how to get
 * from a stored value to a state.
 *
 * THREE COLOURS, NO EXCEPTIONS:
 *
 *   green   safe by default
 *   yellow  action required — you can make it safer, but you have to act
 *   grey    unknown or unread
 *
 * There is deliberately no red. Unknown is not dangerous; it is unknowable,
 * and those are different. A provider being silent is not the same as a
 * provider doing something wrong, and the one colour that would conflate them
 * is the one we do not have.
 *
 * READ THE STATES IN THIS ORDER:
 *
 *   SAFE_BY_DEFAULT   no action needed
 *   OPT_OUT_EXISTS    possible, but off by default — you have to act
 *   UNKNOWN           we read the page; it does not address this. A real
 *                     answer, not a gap. "Their policy doesn't say."
 *   NOT_READ_YET      no fetch has happened. Visually distinct from UNKNOWN
 *                     because "they don't say" and "we didn't look" are
 *                     different facts about different people.
 *   STALE             was read, source has since changed, not re-read yet.
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
    aria: 'Action required: safer setting exists but is off by default',
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
  STALE: {
    id: 'STALE',
    icon: '↻',
    tone: 'unknown',
    label: 'This may be outdated — checking',
    blurb: 'Read once, but the page has changed since.',
    aria: 'Possibly outdated: source changed since it was read',
  },
}

/**
 * A value we have no honest state for.
 *
 * These are the "bad, with no remedy" answers: the provider trains on your
 * data and offers no opt-out, keeps it indefinitely, has no deletion route, or
 * has people reading chats as a matter of routine. They are not safe, there is
 * no action to take, and they are emphatically not unknown — we know, and the
 * answer is unwelcome.
 *
 * The colour system has no slot for them, so they are not silently mapped to
 * grey (which would launder a real finding as "unknowable") or yellow (which
 * would imply an opt-out that does not exist). They are surfaced as
 * NEEDS_DECISION and must be resolved before this ships. See docs/field-states.md.
 */
export const NEEDS_DECISION = 'NEEDS_DECISION'

/**
 * value → state, per field.
 *
 * `undefined` means the value has no mapping yet — which is a bug to be found,
 * not a state to be rendered.
 */
const MAP = {
  trains_on_data: {
    no: 'SAFE_BY_DEFAULT',
    'opt-in-only': 'SAFE_BY_DEFAULT',
    'opt-out-available': 'OPT_OUT_EXISTS',
    yes: NEEDS_DECISION,
    unknown: 'UNKNOWN',
  },
  human_review: {
    no: 'SAFE_BY_DEFAULT',
    conditional: 'OPT_OUT_EXISTS',
    yes: NEEDS_DECISION,
    unknown: 'UNKNOWN',
  },
  retention: {
    ephemeral: 'SAFE_BY_DEFAULT',
    short: 'SAFE_BY_DEFAULT',
    stated: 'OPT_OUT_EXISTS',
    indefinite: NEEDS_DECISION,
    unknown: 'UNKNOWN',
  },
  deletion: {
    'self-serve': 'SAFE_BY_DEFAULT',
    request: 'OPT_OUT_EXISTS',
    partial: 'OPT_OUT_EXISTS',
    none: NEEDS_DECISION,
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
 */
export function stateForField(key, field) {
  if (!field) return 'NOT_READ_YET'
  if (!field.source) return 'NOT_READ_YET'

  if (key === 'residency') {
    const answered = Boolean(field.hq_jurisdiction) && Array.isArray(field.regions) && field.regions.length
    return answered ? 'SAFE_BY_DEFAULT' : 'UNKNOWN'
  }

  const mapped = MAP[key]?.[field.value]
  // A field whose value is missing entirely has not been read, whatever the
  // presence of a source implies.
  if (!mapped) return field.value ? NEEDS_DECISION : 'NOT_READ_YET'
  return mapped
}

/** Every state, in the order they should be presented. */
export const STATE_ORDER = [
  'SAFE_BY_DEFAULT',
  'OPT_OUT_EXISTS',
  'UNKNOWN',
  'NOT_READ_YET',
  'STALE',
]
