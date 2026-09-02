import { noRemedyCopy } from './field-states.js'

/**
 * plain-english.js — one sentence per fact, written for someone who has never
 * read a terms of service.
 *
 *   BANNED:   "Data retention policy is unspecified."
 *   REQUIRED: "We couldn't find how long they keep your data. Their policy
 *              doesn't say."
 *
 * CONSTRAINT 4 lives here, in one place, because the rule is a condition and
 * not a string: "Most people never do" appears when a safer setting exists but
 * is off by default, and only for the two fields where that is both true and
 * worth saying. On deletion and retention it would be alarmist and, worse,
 * inaccurate — you cannot forget to do something nobody told you existed.
 */

/**
 * The two fields where an opt-out genuinely sits behind a setting most people
 * never open. Everywhere else, "opt-out exists" means something a person has
 * to go and ask for, which is a different thing to forget.
 */
/**
 * The (field, value) pairs where a real switch exists and ships in the wrong
 * position. Value-aware, not just field-aware: `human_review: conditional`
 * means a person may read a flagged conversation for trust and safety, and
 * no provider offers a setting for that. Telling someone they can turn it off
 * is a promise about their data we cannot keep — the worst sentence this site
 * could publish, because it is reassuring and false.
 *
 * `trains_on_data: opt-out-available` is the only current member, which is
 * what the value itself says.
 */
const OFF_BY_DEFAULT_VALUES = {
  trains_on_data: ['opt-out-available'],
  human_review: [],
}

export const OFF_BY_DEFAULT_PHRASE = 'Most people never do.'

/** The one condition. Components ask this; they never write the phrase. */
export function showsOffByDefault(key, state, value) {
  if (state !== 'OPT_OUT_EXISTS') return false
  return (OFF_BY_DEFAULT_VALUES[key] ?? []).includes(value)
}

/**
 * field key → state → sentence.
 *
 * Anything absent returns null and the caller falls back to the state's own
 * blurb, rather than inventing a sentence for a value nobody has written for.
 */
const SENTENCES = {
  trains_on_data: {
    SAFE_BY_DEFAULT: "It doesn't learn from your chats.",
    OPT_OUT_EXISTS: 'It can learn from your chats unless you turn that off yourself.',
    UNKNOWN: "Their policy doesn't say whether it learns from your chats.",
    NOT_READ_YET: "We haven't read their policy yet.",
  },
  human_review: {
    SAFE_BY_DEFAULT: 'No person reads your chats.',
    OPT_OUT_EXISTS: 'A person may read your chats unless you turn that off yourself.',
    UNKNOWN: "Their policy doesn't say whether a person can read your chats.",
    NOT_READ_YET: "We haven't read their policy yet.",
  },
  retention: {
    SAFE_BY_DEFAULT: 'It gets rid of your chats quickly.',
    OPT_OUT_EXISTS: 'They say how long they keep your data — it is worth reading the number.',
    UNKNOWN: "Their policy doesn't say how long they keep your data.",
    NOT_READ_YET: "We haven't read their policy yet.",
  },
  deletion: {
    SAFE_BY_DEFAULT: 'You can delete your chats yourself.',
    OPT_OUT_EXISTS: 'Deleting everything takes a request, and they may not delete everything.',
    UNKNOWN: "Their policy doesn't say whether you can delete everything.",
    NOT_READ_YET: "We haven't read their policy yet.",
  },
  residency: {
    SAFE_BY_DEFAULT: 'They say which countries your data is processed in.',
    UNKNOWN: "Their policy doesn't say where your data actually lives.",
    NOT_READ_YET: "We haven't read their policy yet.",
  },
  free_tier: {
    SAFE_BY_DEFAULT: 'The free plan follows the same rules as the paid one.',
    OPT_OUT_EXISTS: 'The free plan plays by different rules — check which one you are on.',
    UNKNOWN: "Their policy doesn't say whether the free plan is different.",
    NOT_READ_YET: "We haven't read their policy yet.",
  },
  enterprise_api: {
    SAFE_BY_DEFAULT: 'There is a stricter version for companies.',
    OPT_OUT_EXISTS: 'Company plans are a separate contract — check which one you are on.',
    UNKNOWN: "Their policy doesn't say whether business plans are different.",
    NOT_READ_YET: "We haven't read their policy yet.",
  },
}

/**
 * The sentence for one field on one tool.
 *
 * NO_REMEDY has no entry here on purpose: those four sentences are fixed
 * strings approved verbatim, held in field-states.js, and no component may
 * paraphrase them.
 */
/**
 * Sentences for values whose state would otherwise misdescribe them.
 *
 * `human_review: conditional` maps to OPT_OUT_EXISTS in the signed-off matrix,
 * but the generic OPT_OUT_EXISTS sentence says "unless you turn that off
 * yourself", and there is nothing to turn off. The value wins over the state
 * here, because the sentence is what a person actually reads.
 */
const VALUE_SENTENCES = {
  'human_review:conditional':
    'A person may read your chats in some situations — for example if something gets flagged. There is nothing to switch off.',
  'retention:stated': 'They say how long they keep your data. It is worth reading the number.',
  'free_tier:differs': 'The free plan plays by different rules — worth checking which you are on.',
  'free_tier:no-free-tier': 'There is no free plan, so these are the paid rules.',
  'enterprise_api:separate': 'Company plans are a separate contract with separate rules.',
  'enterprise_api:same': 'Company plans follow the same rules as personal ones.',
  'enterprise_api:none': 'There is no separate business plan.',
}

export function sentenceFor(key, state, value) {
  if (state === 'NO_REMEDY') return null // see noRemedySentenceFor
  return VALUE_SENTENCES[`${key}:${value}`] ?? SENTENCES[key]?.[state] ?? null
}

/**
 * The NO_REMEDY sentence, which needs the value as well as the key.
 * Kept separate so callers have to pass the field, not just the state.
 */
export function noRemedySentenceFor(key, value) {
  return noRemedyCopy(key, value)
}
