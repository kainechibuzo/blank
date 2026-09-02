import { FIELDS, FIELD_ORDER } from '../data/schema.js'

/**
 * plain-labels.js — the policy label and the human label are different things.
 *
 *   "Data retention"          → "How long does it keep your data?"
 *   "Opt-out mechanism exists" → "You can turn it off — in Settings, yourself."
 *
 * The schema labels were written for the people filling the dataset in. They
 * are accurate and they mean nothing to someone who has never read a terms of
 * service. Every screen that shows a fact to a reader uses `plainLabel`, and
 * the schema label is never rendered to a user.
 */
const PLAIN = {
  trains_on_data: 'Does it learn from your chats?',
  human_review: 'Can a person read your chats?',
  retention: 'How long does it keep your data?',
  deletion: 'Can you delete everything?',
  residency: 'Where does your data actually live?',
  free_tier: 'Is the free plan the same rules as paid?',
  enterprise_api: 'Is there a stricter version for companies?',
}

export function plainLabel(key) {
  return PLAIN[key] ?? FIELDS[key]?.label ?? key
}

/** Every field, in canonical order, as { key, label }. */
export const PLAIN_FIELDS = FIELD_ORDER.map((key) => ({ key, label: plainLabel(key) }))

/**
 * The two facts a comparison row always shows as columns.
 *
 * Fixed rather than chosen per row, because a table where each row shows
 * different columns is not a table — you cannot compare across it. These two
 * are the ones people are actually asking about.
 */
export const KEY_FIELDS = ['trains_on_data', 'human_review']
