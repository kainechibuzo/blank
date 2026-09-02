/**
 * categories.js — the eight things someone might be about to paste.
 *
 * THE HONESTY CONSTRAINT ON THIS FILE
 *
 * No policy we have read distinguishes medical information from source code.
 * They govern what a provider does with *your chats*, and they apply the same
 * way whatever is in them. So a category cannot change the answer — it can
 * only change which answers matter, and how much they matter.
 *
 * That is why each entry carries `leads` (which facts to show first) and a
 * `note` (why those), and nothing else. Writing per-category claims about what
 * happens to medical data specifically would be inventing distinctions the
 * policies do not make, which is the one thing this site must never do. The
 * result screen says this out loud rather than quietly implying otherwise.
 */

export const CATEGORIES = [
  {
    slug: 'medical-info',
    label: 'Medical info',
    phrase: 'medical info',
    leads: ['trains_on_data', 'human_review', 'retention'],
    note: 'Health details are the clearest example of something you would not want a stranger reading. No policy we have read treats medical data differently — so what matters here is whether anyone reads chats at all, and how long they keep them.',
  },
  {
    slug: 'work-emails',
    label: 'Work emails',
    phrase: 'work emails',
    leads: ['trains_on_data', 'human_review', 'enterprise_api'],
    note: 'Your employer may have a say in this too, and your account may be a work account governed by different terms. The enterprise or API tier is often a separate contract with separate rules — worth checking which one you are actually on.',
  },
  {
    slug: 'client-data',
    label: 'Client data',
    phrase: 'client data',
    leads: ['trains_on_data', 'human_review', 'enterprise_api', 'retention'],
    note: 'If the data belongs to someone else, you are also carrying their obligations. The free or consumer tier is usually the wrong place for it; the enterprise tier is frequently a different contract with different promises.',
  },
  {
    slug: 'code',
    label: 'Code',
    phrase: 'code',
    leads: ['trains_on_data', 'human_review'],
    note: 'The question here is almost always training: can the model learn from this, and is that on by default. Confidential or licensed code raises a second question about who else could end up seeing it.',
  },
  {
    slug: 'personal-diary',
    label: 'Personal diary',
    phrase: 'a personal diary entry',
    leads: ['human_review', 'trains_on_data', 'retention'],
    note: 'For something written for no one, the question that matters is whether a person can read it. Training is the second question, and how long it is kept is the third.',
  },
  {
    slug: 'financial-info',
    label: 'Financial info',
    phrase: 'financial info',
    leads: ['human_review', 'trains_on_data', 'retention'],
    note: 'Account details, salary, debts. As with anything sensitive, whether a human can read it comes first, then whether it trains the model, then how long it is kept.',
  },
  {
    slug: 'legal-documents',
    label: 'Legal documents',
    phrase: 'legal documents',
    leads: ['human_review', 'retention', 'deletion'],
    note: 'Once something is in a chat, whether you can get it back out matters as much as who can see it. Deletion rights and retention sit above training here.',
  },
  {
    slug: 'something-else',
    label: 'Something else',
    phrase: 'it',
    leads: ['trains_on_data', 'human_review', 'retention', 'deletion'],
    note: 'Every fact is here, in the order that usually matters. The rules below apply to whatever you type — the policies do not sort by what it is.',
  },
]

/** The label a category shows when it has been chosen. */
export function categoryBySlug(slug) {
  return CATEGORIES.find((c) => c.slug === slug) ?? null
}

/**
 * The phrase used mid-sentence: "Typing medical info into these tools?"
 *
 * For "something else" this is whatever the person typed, so the screen is
 * speaking about their words rather than about our category.
 */
export function phraseFor(category, freeText) {
  if (category?.slug === 'something-else' && freeText?.trim()) {
    const t = freeText.trim()
    // Lower-cased on purpose: it sits mid-sentence, and a capital there reads
    // as a proper noun — "Typing My tax return into these tools?"
    return t.charAt(0).toLowerCase() + t.slice(1)
  }
  return category?.phrase ?? 'it'
}
