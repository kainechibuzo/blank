/**
 * chat.js — Phase 3 discovery flow, deliberately dumb.
 *
 * THE HARD RULE, ENFORCED HERE BY CONSTRUCTION:
 * the chat layer does not have opinions. It is a deterministic parser that maps
 * what someone typed onto the *same* filter predicates and the *same* ranking
 * function the public comparison page uses (`rankTools` in filters.js). It
 * never re-scores, never re-weights for a user, never produces a ranking that
 * could not be reproduced by hand on /compare.
 *
 * There is no language model in the loop by default. That is a choice, not a
 * shortage: an LLM writing fresh recommendations in conversation would create
 * exactly the second, unaccountable ranking system the roadmap forbids. If an
 * LLM is added later, its only permitted job is parsing the user's words into
 * these filters — the ranking must still come from rankTools.
 */

import { FILTER_BY_ID } from '../data/schema.js'
import { rankTools, relaxUntilResults } from './filters.js'
import { scoreTool } from './scoring.js'

/* ------------------------------------------------------------------ lexicon */

/** Words/phrases that map straight onto a comparison filter. */
const LEXICON = {
  no_training: [
    'no training',
    'not train',
    'does not train',
    'doesn t train',
    'doesn’t train',
    'stop training',
    'opt out',
    'train on my',
    'train on your',
    'model improvement',
    'learn from my',
    'use my data',
    'uses my data',
  ],
  no_human_review: [
    'human review',
    'reviewed by',
    'humans read',
    'someone read',
    'no human',
    'read my chats',
    'read my messages',
    'staff read',
  ],
  short_retention: ['retention', 'not stored', 'not kept', 'delete quickly', 'ephemeral', 'short time'],
  self_serve_deletion: ['delete', 'deletion', 'erase', 'remove my data', 'right to erasure'],
  eu_residency: [
    'eu',
    'europe',
    'european',
    'gdpr',
    'uk',
    'britain',
    'residency',
    'stored in europe',
    'data residency',
  ],
  eu_based: ['european company', 'eu based', 'based in europe', 'made in europe', 'european provider'],
  free_tier_exists: ['free', 'free tier', 'no cost', 'cheap', 'free plan', 'without paying'],
  real_free_tier: ['free and fair', 'same rules on free', 'free tier same'],
  enterprise_no_training: [
    'enterprise',
    'business',
    'work',
    'team',
    'company',
    'api',
    'commercial',
    'corporate',
    'office',
    'employer',
  ],
  verified_only: ['verified', 'actually checked', 'confirmed', 'trust the data'],
}

/** Exported so the traceability checker can prove chat only uses real filters. */
export const LEXICON_KEYS = Object.keys(LEXICON)

const PRIVACY_WORDS = ['private', 'privacy', 'secure', 'security', 'safe', 'confidential', 'anon', 'discreet', 'sensitive']

/** Bundles: what people mean by "something for X". */
export const USE_CASES = [
  {
    id: 'journaling',
    label: 'Journaling / personal thinking',
    keywords: ['journal', 'diar', 'therap', 'mental health', 'feelings', 'personal', 'secret', 'private thoughts', 'notes to myself', 'vent'],
    filters: ['no_training', 'no_human_review', 'self_serve_deletion'],
    category: null,
    why: 'Journaling is the use case where the content is most sensitive and the user has least reason to expect an audience.',
  },
  {
    id: 'health',
    label: 'Health / medical questions',
    keywords: ['health', 'medic', 'doctor', 'symptom', 'diagnos', 'prescription', 'patient'],
    filters: ['no_training', 'no_human_review', 'short_retention'],
    category: null,
    why: 'Health questions are special-category data in most privacy regimes, so retention and review matter more than usual.',
  },
  {
    id: 'work',
    label: 'Work / business use',
    keywords: ['work', 'job', 'client', 'colleague', 'employ', 'office', 'business', 'contract', 'legal'],
    filters: ['enterprise_no_training', 'no_training'],
    category: null,
    why: 'Work content is usually governed by a contract with your employer, so a separate enterprise policy is the relevant fact.',
  },
  {
    id: 'study',
    label: 'Studying / coursework',
    keywords: ['student', 'stud', 'school', 'homework', 'essay', 'univers', 'college', 'thesis', 'exam'],
    filters: ['free_tier_exists', 'no_training'],
    category: null,
    why: 'Students need a usable free tier, but coursework is also worth keeping out of a training set.',
  },
  {
    id: 'coding',
    label: 'Coding / development',
    keywords: ['code', 'program', 'develop', 'software', 'bug', 'repo'],
    filters: ['no_training'],
    category: null,
    why: 'Source code is frequently confidential even when it looks harmless, so the training default is the deciding field.',
  },
  {
    id: 'writing',
    label: 'Writing & marketing copy',
    keywords: ['writ', 'copy', 'blog', 'email', 'market', 'caption', 'newsletter'],
    filters: ['no_training'],
    category: 'productivity',
    why: 'Draft text is usually unpublished work product.',
  },
  {
    id: 'images',
    label: 'Images / art',
    keywords: ['image', 'picture', 'artwork', 'draw', 'photo', 'design', 'logo', 'illustrat'],
    filters: [],
    category: 'creative',
    why: 'Category filter only — the privacy fields are scored but not used to exclude tools here.',
  },
  {
    id: 'voice',
    label: 'Voice / audio / music',
    keywords: ['voice', 'audio', 'speech', 'music', 'podcast', 'sound', 'song', 'narrat', 'clone'],
    filters: [],
    category: 'creative',
    why: 'Category filter only — voice data is biometric-adjacent, so check retention and deletion on the tool page.',
  },
]

/* ------------------------------------------------------- clarifying questions */

export const QUESTIONS = [
  {
    id: 'focus',
    prompt: 'What matters most to you here?',
    helper: 'This picks the filters. You can always change them on the comparison page.',
    options: [
      { id: 'privacy', label: 'Privacy of my content', filters: ['no_training', 'no_human_review'] },
      { id: 'cost', label: 'Having a free tier', filters: ['free_tier_exists'] },
      { id: 'region', label: 'Where my data is held', filters: ['eu_residency'] },
      { id: 'use', label: "What I'll use it for", filters: [], asks: 'usecase' },
    ],
  },
  {
    id: 'usecase',
    prompt: "What will you mainly use it for?",
    helper: 'This narrows the category and the fields that matter.',
    options: USE_CASES.map((u) => ({ id: u.id, label: u.label, filters: u.filters, category: u.category, useCase: u.id })),
  },
  {
    id: 'strictness',
    prompt: 'How strict do you want the privacy bar to be?',
    helper: '“Strict” usually returns very few tools. That is information, not a bug.',
    options: [
      { id: 'strict', label: 'Strict — no training, no review', filters: ['no_training', 'no_human_review'] },
      { id: 'pragmatic', label: 'Pragmatic — an opt-out is enough', filters: ['training_opt_out'] },
      { id: 'verified', label: 'Only rows a human has verified', filters: ['verified_only'] },
    ],
  },
]

const QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))

/* ------------------------------------------------------------------ matching */

function normalise(text) {
  return ` ${String(text).toLowerCase().replace(/[^a-z0-9\s’']/g, ' ').replace(/\s+/g, ' ')} `
}

/**
 * Single words match as prefixes so a stem catches its inflections —
 * "journal" matches "journaling", "code" matches "coding". Users do not type
 * lemmas, and a parser that misses "journaling" is useless at exactly the
 * moment someone is asking about something sensitive.
 */
function hasPhrase(haystack, phrase) {
  if (phrase.includes(' ')) return haystack.includes(` ${phrase} `)
  return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(haystack)
}

/** Small stable hash, used only to label a result set so it can be re-derived. */
export function signature(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i)
  return (h >>> 0).toString(36).padStart(6, '0').slice(0, 6)
}

/**
 * Turn free text into a filter set. Pure function: same text, same filters,
 * every time, for every user.
 *
 * @param {string} rawText
 * @param {object} ctx
 * @param {string[]} ctx.askedQuestions  question ids already asked (max 2)
 * @param {string[]} ctx.answerFilters   filters contributed by answered questions
 * @param {string|null} ctx.answerCategory
 * @returns {{kind:'ask'|'answer', ...}}
 */
export function planQuery(rawText, ctx = {}) {
  const asked = ctx.askedQuestions ?? []
  const text = normalise(rawText)

  const matched = []
  for (const [filterId, phrases] of Object.entries(LEXICON)) {
    const hits = phrases.filter((p) => hasPhrase(text, p))
    if (hits.length) matched.push({ filterId, terms: hits })
  }

  const useCase = USE_CASES.find((u) => u.keywords.some((k) => hasPhrase(text, k))) ?? null
  const filters = new Set(matched.map((m) => m.filterId))
  if (useCase) useCase.filters.forEach((f) => filters.add(f))
  ;(ctx.answerFilters ?? []).forEach((f) => filters.add(f))

  let category = ctx.answerCategory ?? (useCase?.category ?? null)

  // "Free" alone shouldn't demand a perfectly fair free tier.
  if (filters.has('real_free_tier') && !hasPhrase(text, 'same rules')) filters.add('free_tier_exists')

  const wantsPrivacy = PRIVACY_WORDS.some((w) => hasPhrase(text, w))
  const statedAnything = filters.size > 0 || Boolean(category)

  // Ask at most two questions, and only when the answer changes the result set.
  if (asked.length < 2) {
    if (!statedAnything && !asked.includes('focus')) {
      return { kind: 'ask', question: QUESTION_BY_ID.focus, partial: { filters: [...filters], category }, matched }
    }
    if (wantsPrivacy && ![...filters].some((f) => f.startsWith('no_') || f === 'training_opt_out') && !asked.includes('strictness')) {
      return { kind: 'ask', question: QUESTION_BY_ID.strictness, partial: { filters: [...filters], category }, matched }
    }
    if (!useCase && !category && !asked.includes('usecase') && asked.length < 1) {
      return { kind: 'ask', question: QUESTION_BY_ID.usecase, partial: { filters: [...filters], category }, matched }
    }
  }

  if (!statedAnything) {
    return {
      kind: 'answer',
      filters: [...filters],
      category,
      useCase: null,
      matched,
      empty: true,
    }
  }

  return {
    kind: 'answer',
    filters: [...filters].filter((id) => FILTER_BY_ID[id]),
    category,
    useCase,
    matched,
    empty: false,
  }
}

/**
 * Produce a result set. Always via rankTools — never a bespoke ordering.
 */
export function answer(tools, plan, { limit = 6 } = {}) {
  const { filters, category } = plan
  const exact = rankTools(tools, { filters, category, sort: 'score' })

  if (exact.length > 0) {
    return {
      results: exact.slice(0, limit),
      total: exact.length,
      dropped: [],
      filters,
      category,
      relaxed: false,
    }
  }

  const relaxed = relaxUntilResults(tools, { filters, category, sort: 'score', limit })
  return {
    results: relaxed.results,
    total: relaxed.total,
    dropped: relaxed.dropped,
    filters: relaxed.remaining,
    requestedFilters: filters,
    category,
    relaxed: true,
  }
}

/** Why a given tool is in this result set — shown on every card, always. */
export function explain(tool, filters) {
  const matched = filters.filter((id) => FILTER_BY_ID[id] && FILTER_BY_ID[id].matches(tool))
  const s = scoreTool(tool)
  return { matched, score: s.score, coverage: s.coverage, unverified: tool.verification.status !== 'verified' }
}

export function openingGreeting() {
  return {
    role: 'assistant',
    kind: 'text',
    text:
      'Describe what you need in your own words — “something private for journaling”, “a free tool for essays”, “an EU-based assistant for work”. I translate that into the same filters the comparison page uses, then rank with the same public score. Nothing here is influenced by sponsorship.',
  }
}

export const SUGGESTIONS = [
  'I want something private for journaling',
  'Free tool for essays and studying',
  'EU-based assistant for work',
  'Image generator that doesn’t train on my prompts',
]
