/**
 * schema.js — the single source of truth for what this project tracks and how
 * each value is labelled in the UI.
 *
 * Design constraint from the roadmap: a fixed set of tracked fields per tool, no more.
 * The roadmap said eight. The schema has seven, and the weights say seven was
 * always the intent: 25+20+15+15+10+10+5 = 100 exactly. An eighth field would
 * either score zero or push the total past 100. The prose was wrong.
 * Scope discipline is a feature here — every extra field is extra verification
 * labour forever, and verification labour is the actual cost of this business.
 */

export const SITE = {
  // Descriptive rather than branded, because a placeholder wordmark in a fixed
  // header reads as unfinished. This is the ONLY line to change to rename the
  // site: nav, footer, page title and metadata all read from here.
  name: 'AI Transparency',
  tagline: 'What AI products actually do with your data, in plain English.',
  phase: 'Phase 1 — transparency + comparison (Phase 3 chat discovery in preview)',
  /* Where a correction goes. A public issue, not a contact form: the report
     becomes part of the audit trail rather than a private email nobody else can
     see or check. */
  repo: 'https://github.com/kainechibuzo/blank',
}

/** Verification lifecycle. Anything not `verified` is rendered as provisional. */
export const VERIFICATION_STATUSES = {
  'draft-unverified': {
    label: 'Draft — unverified',
    tone: 'unknown',
    blurb:
      'Entered to exercise the schema. No human has read the policy and confirmed this row. Do not rely on it.',
  },
  'partially-verified': {
    label: 'Partly verified',
    tone: 'mixed',
    blurb:
      'Some fields were read and confirmed against the linked policy on the stated date. The rest are not established yet, and say so — a partly-read row is not a read row.',
  },
  observed: {
    label: 'Observed — not reviewed',
    tone: 'unknown',
    blurb:
      'The policy page was fetched by the checker and recorded on the stated date. A machine noting that a page says something is not a person confirming it. Nothing here is confirmed until a human reads the page.',
  },
  verified: {
    label: 'Verified',
    tone: 'good',
    blurb: 'Read by a human reviewer and confirmed against the linked policy on the stated date.',
  },
  // NOTE: 'stale' here is the watchdog concept, not the FieldState component
  // state (dropped eb76712). Reconcile at Phase 5.
  stale: {
    label: 'Stale — needs re-check',
    tone: 'mixed',
    blurb: 'Previously verified, but the policy page changed since, or the review is past its shelf life.',
  },
  disputed: {
    label: 'Disputed',
    tone: 'bad',
    blurb: 'A credible correction is being assessed. The row is shown, flagged, until resolved.',
  },
}

export const CATEGORIES = {
  assistant: 'General assistant',
  search: 'Search / research',
  creative: 'Image, video & voice',
  productivity: 'Workplace & writing',
  companion: 'Companion & roleplay',
}

/**
 * The seven tracked fields.
 * `tone` drives the pill colour: good / mixed / bad / unknown.
 * Unknown is never rendered as neutral-positive — it is its own visible state.
 */
export const FIELDS = {
  trains_on_data: {
    label: 'Trains on your data?',
    question: 'Is what you type used to make the model better?',
    plain: 'Whether your conversations or uploads get folded into future versions of the model.',
    options: {
      no: { label: 'No', tone: 'good', short: 'Not used for training' },
      'opt-in-only': { label: 'Only if you opt in', tone: 'good', short: 'Off unless you turn it on' },
      'opt-out-available': {
        label: 'Yes by default — you can opt out',
        tone: 'mixed',
        short: 'On by default, opt-out exists',
      },
      yes: { label: 'Yes — no opt-out found', tone: 'bad', short: 'On by default' },
      unknown: { label: 'Unknown', tone: 'unknown', short: 'Not established' },
    },
  },
  human_review: {
    label: 'Human review of conversations?',
    question: 'Can a person read what you wrote?',
    plain:
      'Whether staff or contractors may read conversations, and under what conditions (abuse checks, quality review, legal requests).',
    options: {
      no: { label: 'No', tone: 'good', short: 'No human review' },
      conditional: {
        label: 'In limited cases',
        tone: 'mixed',
        short: 'Limited / conditional review',
      },
      yes: { label: 'Yes', tone: 'bad', short: 'Conversations may be reviewed' },
      unknown: { label: 'Unknown', tone: 'unknown', short: 'Not established' },
    },
  },
  retention: {
    label: 'Data retention',
    question: 'How long does your data sit there?',
    plain: 'How long conversations and uploads are kept before they are deleted or de-identified.',
    options: {
      ephemeral: { label: 'Not retained beyond the session', tone: 'good', short: 'Ephemeral' },
      short: { label: 'Short, bounded period (≈30 days or less)', tone: 'good', short: '≤ ~30 days' },
      stated: { label: 'Retained, period stated', tone: 'mixed', short: 'Stated period' },
      indefinite: { label: 'Retained indefinitely', tone: 'bad', short: 'Indefinite' },
      unknown: { label: 'Unknown', tone: 'unknown', short: 'Not established' },
    },
  },
  deletion: {
    label: 'Deletion rights',
    question: 'Can you actually get rid of it?',
    plain:
      'Whether you can delete your own data, and whether that is a button in the product or a request you have to make.',
    options: {
      'self-serve': { label: 'Yes — in the product', tone: 'good', short: 'Self-serve deletion' },
      request: { label: 'Yes — by request only', tone: 'mixed', short: 'Deletion on request' },
      partial: { label: 'Partially', tone: 'mixed', short: 'Partial deletion' },
      none: { label: 'No clear route', tone: 'bad', short: 'No clear route' },
      unknown: { label: 'Unknown', tone: 'unknown', short: 'Not established' },
    },
  },
  residency: {
    label: 'Regional availability / data residency',
    question: 'Where does your data live, and who has jurisdiction?',
    plain:
      'Where the provider is established, where data may be stored or processed, and whether an EU/UK option exists.',
    // Residency is not a single enum: it carries regions[] + hq_jurisdiction + eu_option.
    options: {},
  },
  free_tier: {
    label: 'Free tier vs paid tier',
    question: 'Is the free version held to the same rules?',
    plain:
      'Whether the policy differs between free and paid tiers — free tiers are the most common place where training-on-by-default lives.',
    options: {
      'same-policy': { label: 'Same policy on both tiers', tone: 'good', short: 'Same on free & paid' },
      differs: { label: 'Policies differ', tone: 'mixed', short: 'Free tier differs' },
      'no-free-tier': { label: 'No free tier', tone: 'unknown', short: 'No free tier' },
      unknown: { label: 'Unknown', tone: 'unknown', short: 'Not established' },
    },
  },
  enterprise_api: {
    label: 'Enterprise / API tier',
    question: 'Is there a separate, usually stricter policy?',
    plain:
      'Whether business, enterprise or API usage is governed by different terms — often the tier where training is off.',
    options: {
      'separate-no-training': {
        label: 'Separate policy — no training',
        tone: 'good',
        short: 'Separate, no training',
      },
      separate: { label: 'Separate policy, terms unclear', tone: 'mixed', short: 'Separate policy' },
      same: { label: 'Same policy', tone: 'mixed', short: 'Same policy' },
      none: { label: 'No enterprise/API tier', tone: 'unknown', short: 'Not offered' },
      unknown: { label: 'Unknown', tone: 'unknown', short: 'Not established' },
    },
  },
}

export const FIELD_ORDER = [
  'trains_on_data',
  'human_review',
  'retention',
  'deletion',
  'residency',
  'free_tier',
  'enterprise_api',
]

/** Fields that count towards the "coverage" figure (i.e. answered vs unknown). */
export const SCORED_FIELDS = FIELD_ORDER

/**
 * Filters available in the comparison view.
 * Every filter is a pure predicate over a tool's fields — the chat layer
 * (Phase 3) calls these same predicates, which is what makes its output a view
 * into the comparison rather than a second ranking system.
 */
export const FILTERS = [
  {
    id: 'no_training',
    group: 'Data use',
    label: "Doesn't train on your data",
    help: 'Training is off by default, or only happens if you opt in.',
    matches: (t) => ['no', 'opt-in-only'].includes(t.fields.trains_on_data.value),
  },
  {
    id: 'training_opt_out',
    group: 'Data use',
    label: 'Training opt-out available',
    help: 'Trains by default, but there is a documented way to say no.',
    matches: (t) => t.fields.trains_on_data.value === 'opt-out-available',
  },
  {
    id: 'no_human_review',
    group: 'Data use',
    label: 'No human review of conversations',
    help: 'No person reads conversations as a matter of routine.',
    matches: (t) => t.fields.human_review.value === 'no',
  },
  {
    id: 'short_retention',
    group: 'Data use',
    label: 'Short retention (≤ ~30 days)',
    help: 'Data is ephemeral or deleted on a short, bounded clock.',
    matches: (t) => ['ephemeral', 'short'].includes(t.fields.retention.value),
  },
  {
    id: 'self_serve_deletion',
    group: 'Your rights',
    label: 'Data can be fully deleted',
    help: 'Deletion is a control in the product, not a favour you ask for.',
    matches: (t) => t.fields.deletion.value === 'self-serve',
  },
  {
    id: 'eu_residency',
    group: 'Jurisdiction',
    label: 'Data stays in Europe',
    help: 'Provider is EU/UK-established or offers EU/UK data residency.',
    matches: (t) => t.fields.residency.eu_option === true,
  },
  {
    id: 'eu_based',
    group: 'Jurisdiction',
    label: 'EU/UK-based provider',
    help: 'Headquartered in the EU or UK.',
    matches: (t) => ['EU', 'UK'].includes(t.fields.residency.hq_jurisdiction),
  },
  {
    id: 'real_free_tier',
    group: 'Commercials',
    label: 'Free plan has the same rules as paid',
    help: 'A free tier exists and is governed by the same terms as paid.',
    matches: (t) => t.fields.free_tier.value === 'same-policy',
  },
  {
    id: 'free_tier_exists',
    group: 'Commercials',
    label: 'Free tier of any kind',
    help: 'A free tier exists, even if the terms differ from paid.',
    matches: (t) => ['same-policy', 'differs'].includes(t.fields.free_tier.value),
  },
  {
    id: 'enterprise_no_training',
    group: 'Commercials',
    label: 'Enterprise/API tier without training',
    help: 'There is a business tier whose terms exclude training.',
    matches: (t) => t.fields.enterprise_api.value === 'separate-no-training',
  },
  {
    id: 'verified_only',
    group: 'Data quality',
    label: 'Verified rows only',
    help:
      'Hide anything a human has not confirmed. With the current draft dataset this returns nothing — which is the honest answer.',
    matches: (t) => t.verification.status === 'verified',
  },
]

export const FILTER_BY_ID = Object.fromEntries(FILTERS.map((f) => [f.id, f]))

export const FILTER_GROUPS = [...new Set(FILTERS.map((f) => f.group))]

export const SORTS = [
  { id: 'score', label: 'Transparency score' },
  { id: 'coverage', label: 'Data completeness' },
  { id: 'name', label: 'Name (A–Z)' },
  { id: 'verified', label: 'Most recently verified' },
]
