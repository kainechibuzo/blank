/**
 * aduo.js — the balance-of-performance boost, and the fact that it is not
 * ratified yet.
 *
 * ADUO exists because a listing with few upvotes but strong underlying signals
 * would otherwise be buried under incumbents who won early and snowballed on raw
 * vote count. It is a deliberate, disclosed exception to "ranking follows
 * votes" — visible on the listing, never invisible.
 *
 * TWO RULES SHAPE THIS FILE:
 *
 * 1. THE THRESHOLDS ARE NOT RATIFIED. `ratified: false` is load-bearing, not
 *    documentation. They must be agreed before the first grant, not after:
 *    deciding the bar once you can see who clears it turns a rule into a favour.
 *    A check fails the build if this flips to true without the date and record
 *    being filled in.
 * 2. NOTHING HERE TOUCHES PHASE 1. The boost reorders the directory only. It
 *    never enters a transparency score or the public comparison, and a check
 *    enforces that.
 */

export const ADUO = {
  ratified: false,
  ratified_on: null,
  ratified_by: null,

  thresholds: {
    traffic: {
      label: 'Traffic trend',
      rule: '≥ 15% month-on-month growth over 3 months, from a base of ≥ 1,000 monthly visits',
      // Not computable here: this site runs no analytics and has no traffic
      // provider. The applicant supplies evidence and a human records what they
      // verified — inventing a number would be worse than leaving it unknown.
      computable: false,
    },
    reviews: {
      label: 'External reviews',
      rule: '≥ 10 off-site reviews, median sentiment ≥ 4/5, at least 3 substantive',
      computable: false,
    },
    tos: {
      label: 'ToS / privacy score',
      rule: '≥ 60 / 100 with coverage ≥ 70%. An unverified row cannot qualify.',
      computable: true,
      minScore: 60,
      minCoverage: 70,
    },
    upvoteCeiling: {
      label: 'Upvote ceiling',
      rule: 'Fewer than 50 upvotes — above this the listing is presumed able to compete on votes alone.',
      computable: true,
      maxUpvotes: 50,
    },
  },
}

/**
 * Evaluate a listing against the thresholds.
 *
 * `tool` is the linked Phase 1 row (may be absent). `upvotes` is the decayed
 * community score. Traffic and reviews can only ever come back 'unknown' from
 * this function, because nothing here can see them — they are recorded by a
 * human at decision time.
 *
 * @returns {{checks: Array, computablePass: boolean|null, unknownCount: number}}
 */
export function evaluateAduo({ tool, upvotes }) {
  const checks = []

  // 1. ToS score — computed, and never from an unverified row.
  if (!tool) {
    checks.push({
      key: 'tos',
      label: ADUO.thresholds.tos.label,
      status: 'unknown',
      detail: 'No Phase 1 row is linked to this listing, so there is no score to check.',
    })
  } else if (tool.verification?.status !== 'verified') {
    checks.push({
      key: 'tos',
      label: ADUO.thresholds.tos.label,
      status: 'fail',
      detail: 'The linked row is not verified. An unverified row cannot qualify.',
    })
  } else {
    const s = tool.score ?? 0
    const coverage = tool.coverage ?? 0
    const pass = s >= ADUO.thresholds.tos.minScore && coverage >= ADUO.thresholds.tos.minCoverage
    checks.push({
      key: 'tos',
      label: ADUO.thresholds.tos.label,
      status: pass ? 'pass' : 'fail',
      detail: `Score ${s}/100, coverage ${coverage}% (needs ≥ ${ADUO.thresholds.tos.minScore} and ≥ ${ADUO.thresholds.tos.minCoverage}%).`,
    })
  }

  // 2. Upvote ceiling — a listing that already has momentum does not need help.
  const up = Number(upvotes ?? 0)
  const underCeiling = up < ADUO.thresholds.upvoteCeiling.maxUpvotes
  checks.push({
    key: 'upvoteCeiling',
    label: ADUO.thresholds.upvoteCeiling.label,
    status: underCeiling ? 'pass' : 'fail',
    detail: `Decayed score ${up.toFixed(1)} (needs < ${ADUO.thresholds.upvoteCeiling.maxUpvotes}).`,
  })

  // 3 and 4 — evidence-based, recorded by a human.
  checks.push({
    key: 'traffic',
    label: ADUO.thresholds.traffic.label,
    status: 'unknown',
    detail: 'Not computable from this site. The applicant supplies evidence; a human records what they verified.',
  })
  checks.push({
    key: 'reviews',
    label: ADUO.thresholds.reviews.label,
    status: 'unknown',
    detail: 'Not computable from this site. The applicant supplies evidence; a human records what they verified.',
  })

  const computable = checks.filter((c) => c.key === 'tos' || c.key === 'upvoteCeiling')
  return {
    checks,
    // null when nothing computable cleared, so "all pass" can never be true
    // just because the hard parts are unknown.
    computablePass: computable.every((c) => c.status === 'pass'),
    unknownCount: checks.filter((c) => c.status === 'unknown').length,
  }
}
