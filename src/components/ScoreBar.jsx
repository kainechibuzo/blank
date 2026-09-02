/**
 * ScoreBar — the same rule as FactPair, drawn as a bar.
 *
 *   The filled bar is COVERAGE. The number at the end is the SCORE. They are
 *   one visual unit and are never separated, because:
 *
 *     7/7  ████████████████████  92
 *     3/7  ██████░░░░░░░░░░░░░░  92
 *
 *   Same score. Two completely different claims. If the bar is not doing that
 *   work at a glance, without reading a label, the bar is wrong — and a bare
 *   92 next to a bare 92 is the failure mode this exists to prevent.
 *
 * Below 70% coverage the score renders as an outline rather than solid, the
 * same signal FactPair uses, so a half-read row looks less settled than a
 * fully-read one even before you compare bar lengths.
 */

const THRESHOLD = 70

export default function ScoreBar({ score, coverage, read, total, className = '' }) {
  const thin = coverage < THRESHOLD
  const sentence = [
    `Transparency score ${score} out of 100`,
    `${read} of ${total} fields read`,
    `${coverage}% answered by the policy`,
    thin ? 'incomplete — treat the score as provisional' : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      role="group"
      aria-label={`${sentence}.`}
      className={`flex items-center gap-2 ${className}`}
    >
      <span className="sr-only">{`${sentence}.`}</span>

      <span
        aria-hidden="true"
        className="w-9 shrink-0 font-mono text-xs tabular-nums text-ink-soft"
      >
        {read}/{total}
      </span>

      {/* aria-hidden: the bar restates what the fraction and the percentage
          already say, and a screen reader gains nothing from a row of blocks. */}
      <span
        aria-hidden="true"
        className="relative block h-2.5 w-24 shrink-0 overflow-hidden rounded-full bg-line"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-ink"
          style={{ width: `${Math.max(0, Math.min(100, coverage))}%` }}
        />
      </span>

      <span
        aria-hidden="true"
        className={`w-8 shrink-0 text-right text-sm font-semibold tabular-nums ${
          thin ? 'score-outline text-ink-soft' : 'text-ink'
        }`}
      >
        {score}
      </span>
    </div>
  )
}
