/**
 * FactPair — a transparency score, and the two numbers that stop it lying.
 *
 * THE RULE, STRUCTURAL NOT DECORATIVE: a score never appears on its own. It
 * appears here, with coverage beside it and the read fraction under it, because
 * a score without them is a number that looks like a verdict. 59 on a row where
 * we have read everything means something quite different from 59 on a row
 * where we have read four fields out of seven — and the fraction is the only
 * thing that tells you which you are looking at.
 *
 * Rules enforced here:
 *   - score, coverage and fraction render together, or not at all.
 *   - below 70% coverage the score renders as an outline, not solid fill. A
 *     half-read row should not look as settled as a fully-read one.
 *   - the fraction is always visible on the card. Never a tooltip, never
 *     buried on a detail page.
 *   - the word "partially-verified" never appears. The fraction replaces it.
 *   - read by a screen reader as one unit, because it is one claim.
 */

const THRESHOLD = 70

export default function FactPair({ score, coverage, fraction, className = '' }) {
  const thin = coverage < THRESHOLD
  const sentence = buildSentence({ score, coverage, fraction })

  return (
    <div
      role="group"
      aria-label={sentence}
      className={`inline-flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2 ${className}`}
    >
      {/* One sentence for assistive tech, so the three numbers arrive together. */}
      <span className="sr-only">{sentence}</span>

      <div aria-hidden="true" className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-semibold tabular-nums leading-none ${
            thin ? 'score-outline text-ink-soft' : 'text-ink'
          }`}
        >
          {score}
        </span>
        <span className="text-xs text-ink-faint">/100</span>
      </div>

      <div aria-hidden="true" className="border-l border-line pl-3">
        <p className="text-xs leading-tight text-ink-soft">
          <span className="font-medium tabular-nums text-ink">{fraction}</span> fields read
        </p>
        <p className="text-[11px] leading-tight text-ink-faint">
          <span className="tabular-nums">{coverage}%</span> answered
        </p>
      </div>
    </div>
  )
}

function buildSentence({ score, coverage, fraction }) {
  const [read, total] = String(fraction ?? '0/7').split('/')
  const parts = [`Transparency score ${score} out of 100`]
  parts.push(`${read} of ${total ?? 7} fields read`)
  parts.push(`${coverage}% answered by the policy`)
  if (coverage < THRESHOLD) parts.push('incomplete — treat the score as provisional')
  return `${parts.join(', ')}.`
}
