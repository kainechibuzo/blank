/**
 * policy-patterns.js — what the checker looks for on a policy page.
 *
 * WHAT THIS IS, AND WHAT IT IS NOT.
 *
 * These are matching patterns for a script. They are instrumentation, like a
 * grep: the phrases exist to be matched against a fetched page, they are never
 * rendered to a user, and they are not claims about any provider.
 *
 * Two rules the whole design hangs on:
 *
 *  1. NO POLICY TEXT IS EVER STORED. A match records only the pattern's id and
 *     how many times it fired. Not the sentence, not the surrounding words, not
 *     the section heading. The project paraphrases policy, never quotes it, and
 *     a bot with a database is exactly where that rule would quietly die.
 *
 *  2. A MATCH IS NOT A VALUE. The checker proposes; a person confirms. A page
 *     saying "we do not train on your data" in a marketing paragraph and a page
 *     saying it in the privacy policy are very different, and this cannot tell
 *     them apart. So every result carries a confidence, and conflicting matches
 *     are reported as conflicts rather than resolved by fiat.
 *
 * Confidence is deliberately hard to earn: two *distinct* patterns agreeing
 * gives 'high'. One pattern gives 'medium'. Two patterns suggesting different
 * values gives 'conflicted', which is the honest answer for most policy prose.
 */

/**
 * Each pattern: id, the value it points at, and the regex.
 * `strong` patterns are distinctive enough to count double.
 */
export const PATTERNS = {
  trains_on_data: [
    { id: 'trains.no.negated_use', value: 'no', strong: true, re: /\b(do(es)?\s?not|don't|will\s?not|won't|never)\s+(use|train|retain)[^.]{0,80}\b(train(ing)?|improve|model|models)\b/i },
    { id: 'trains.no.not_used_to', value: 'no', strong: true, re: /\bnot\s+(be\s+)?used\s+to\s+(train|improve|develop)\b/i },
    { id: 'trains.no.default_off', value: 'opt-in-only', re: /\b(only\s+if\s+you\s+opt\s?in|unless\s+you\s+(opt\s?in|choose|consent)|off\s+by\s+default)\b/i },
    { id: 'trains.optout.can_opt_out', value: 'opt-out-available', strong: true, re: /\b(opt\s?out|turn\s+off|disable)[^.]{0,60}\b(train(ing)?|improv(ing|e)|model\s+improvement|data\s+controls?)\b/i },
    { id: 'trains.optout.settings', value: 'opt-out-available', re: /\b(settings|controls?|preferences)[^.]{0,40}\b(improve|train|model)\b/i },
    { id: 'trains.yes.may_use', value: 'yes', strong: true, re: /\b(may|can|will|might)\s+(be\s+)?use[sd]?\b[^.]{0,60}\b(to\s+)?(train|improve|develop|fine\s?tune)\b/i },
    { id: 'trains.yes.use_to_improve', value: 'yes', re: /\buse\s+(your\s+)?(content|conversations?|data|inputs?|prompts?)[^.]{0,60}\b(to\s+)?(improve|train|develop)\b/i },
  ],
  human_review: [
    { id: 'review.no.nobody_reads', value: 'no', strong: true, re: /\b(no\s+(one|human|person)|not\s+(read|reviewed)\s+by\s+(a\s+)?(human|person))\b/i },
    { id: 'review.conditional.staff_may', value: 'conditional', strong: true, re: /\b(may|might|can)\s+be\s+(reviewed|read|accessed|monitored|processed)\s+by\b[^.]{0,60}\b(staff|employees?|personnel|reviewers?|contractors?|team|humans?)\b/i },
    { id: 'review.conditional.limited', value: 'conditional', re: /\b(limited|certain|narrow)\s+(circumstances|cases|situations|purposes)\b/i },
    { id: 'review.conditional.abuse', value: 'conditional', re: /\b(to\s+)?(prevent|detect|investigate|monitor)\b[^.]{0,60}\b(abuse|fraud|misuse|harm|illegal|security)\b/i },
    { id: 'review.yes.staff_read', value: 'yes', strong: true, re: /\b(staff|employees?|contractors?|reviewers?|humans?)\s+(routinely\s+)?(review|read|access|monitor)\b/i },
  ],
  retention: [
    { id: 'retention.ephemeral.not_retained', value: 'ephemeral', strong: true, re: /\b(do(es)?\s?not|don't|not)\s+(retain|store|keep)\b/i },
    { id: 'retention.ephemeral.deleted', value: 'ephemeral', re: /\bdeleted\s+(immediately|right\s+away|promptly|within\s+\d+\s+hours)\b/i },
    { id: 'retention.short.days', value: 'short', strong: true, re: /\b(within|for|after|up\s+to)\s+(about\s+)?(\d{1,3}|thirty|sixty|ninety)\s+days\b/i },
    { id: 'retention.stated.period', value: 'stated', re: /\bretain\b[^.]{0,60}\b(for|until|no\s+longer\s+than)\b[^.]{0,40}\b(days?|months?|years?)\b/i },
    { id: 'retention.stated.retention_period', value: 'stated', re: /\bretention\s+(period|schedule|window)\b/i },
    { id: 'retention.indefinite.as_long', value: 'indefinite', re: /\b(indefinitely|as\s+long\s+as\s+(we|necessary|needed|your\s+account\s+(is|remains)))\b/i },
  ],
  deletion: [
    { id: 'deletion.self_serve.in_product', value: 'self-serve', strong: true, re: /\bdelete\s+(your\s+)?(account|data|conversations?|history|content)\b[^.]{0,60}\b(settings|at\s+any\s+time|in\s+the\s+(app|product)|dashboard)\b/i },
    { id: 'deletion.self_serve.any_time', value: 'self-serve', re: /\b(you\s+can|may)\s+delete\b[^.]{0,60}\b(at\s+any\s+time)\b/i },
    { id: 'deletion.request.submit', value: 'request', strong: true, re: /\b(submit|send|make)\s+a?\s?(request|deletion\s+request)\b[^.]{0,60}\b(delete|deletion|erase|remove)\b/i },
    { id: 'deletion.request.contact', value: 'request', re: /\b(contact|email|write\s+to)\s+us\b[^.]{0,60}\b(delete|deletion|erase|remove)\b/i },
    { id: 'deletion.request.exercise_rights', value: 'request', re: /\b(request|exercise)\s+(that\s+we\s+)?(delete|deletion|erasure)\b/i },
  ],
  residency: [
    { id: 'residency.eu.eu_mentioned', value: 'eu-present', re: /\b(european\s+union|eu\s+(data|residency|region)|eea|europe)\b/i },
    { id: 'residency.us.us_mentioned', value: 'us-present', re: /\b(united\s+states|u\.?s\.?a?\.?\s+(based|stored|processed)|us\s+region)\b/i },
    { id: 'residency.uk.uk_mentioned', value: 'uk-present', re: /\b(united\s+kingdom|u\.?k\.?\s+(based|stored|processed))\b/i },
    { id: 'residency.choice.data_residency', value: 'choice-present', strong: true, re: /\bdata\s+residency\b/i },
    { id: 'residency.choice.stored_in', value: 'choice-present', re: /\b(stored|processed|hosted)\s+in\b[^.]{0,60}\b(country|countries|region|united\s+states|europe|eu)\b/i },
  ],
  free_tier: [
    { id: 'free.no_free.subscription_required', value: 'no-free-tier', strong: true, re: /\b(no\s+free\s+(tier|plan|version)|requires?\s+a\s+(paid\s+)?subscription|paid\s+(subscription|plan)\s+(is\s+)?required)\b/i },
    { id: 'free.differs.free_differs', value: 'differs', strong: true, re: /\b(free\s+(version|tier|plan|users?))\b[^.]{0,120}\b(different|differ|not\s+the\s+same|whereas)\b/i },
    { id: 'free.same.same_policy', value: 'same-policy', re: /\b(same|regardless\s+of)\b[^.]{0,60}\b(free|paid|plan|tier)\b/i },
    { id: 'free.mentions_tiers', value: 'unknown', re: /\b(free\s+(tier|plan|version)|paid\s+(tier|plan))\b/i },
  ],
  enterprise_api: [
    { id: 'ent.no_training.separate_no_train', value: 'separate-no-training', strong: true, re: /\b(enterprise|business|api|commercial)\b[^.]{0,140}\b(do(es)?\s?not|not|never)\s+(use|train)\b[^.]{0,60}\b(train|model)\b/i },
    { id: 'ent.no_training.api_no_train', value: 'separate-no-training', strong: true, re: /\b(api|enterprise|business)\b[^.]{0,80}\b(not\s+)?(used\s+)?to\s+(train|improve)\b/i },
    { id: 'ent.separate.enterprise_privacy', value: 'separate', re: /\b(enterprise|business)\s+privacy\b/i },
    { id: 'ent.separate.api_terms', value: 'separate', re: /\b(api|commercial)\s+(terms|data|usage|agreement)\b/i },
    { id: 'ent.separate.dpa', value: 'separate', re: /\bdata\s+processing\s+(addendum|agreement)\b/i },
  ],
}

/** Fields the checker can say anything about at all. */
export const PATTERN_FIELDS = Object.keys(PATTERNS)

/**
 * Run every pattern for a field against normalised page text.
 *
 * Returns `{ suggested, confidence, matched, conflicted }`:
 *
 *   confidence 'high'        two or more distinct patterns agree on one value,
 *                            or one strong pattern fires more than once
 *   confidence 'medium'      exactly one pattern fired
 *   confidence 'none'        nothing matched — which is information, not failure
 *   conflicted               patterns disagree. Reported, never resolved here.
 */
export function detectField(field, text) {
  const patterns = PATTERNS[field]
  if (!patterns || !text) return { suggested: null, confidence: 'none', matched: [], conflicted: false }

  const matched = []
  const counts = {}
  for (const p of patterns) {
    const hits = (text.match(new RegExp(p.re.source, 'gi')) ?? []).length
    if (!hits) continue
    matched.push({ id: p.id, value: p.value, hits })
    const weight = hits * (p.strong ? 2 : 1)
    counts[p.value] = (counts[p.value] ?? 0) + weight
  }

  // 'unknown' is a marker for "mentions the concept but says nothing decidable".
  const ranked = Object.entries(counts)
    .filter(([value]) => value !== 'unknown')
    .sort((a, b) => b[1] - a[1])

  if (!ranked.length) return { suggested: null, confidence: 'none', matched, conflicted: false }

  const [top, topWeight] = ranked[0]
  const runnerUp = ranked[1]?.[1] ?? 0
  const distinct = matched.filter((m) => m.value === top).length
  const conflicted = runnerUp > 0 && runnerUp >= topWeight * 0.6

  const confidence = conflicted ? 'medium' : distinct >= 2 || topWeight >= 4 ? 'high' : 'medium'
  return { suggested: top, confidence, matched, conflicted }
}

/** Run every field against one page. */
export function detectAll(text) {
  const out = {}
  for (const field of PATTERN_FIELDS) out[field] = detectField(field, text)
  return out
}
