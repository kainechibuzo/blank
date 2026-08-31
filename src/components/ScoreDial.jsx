import { band } from '../lib/scoring.js'

/**
 * Score and coverage are always shown together and always separate.
 * A high score on a thin row is not a good tool — it is a row nobody has
 * finished reading.
 *
 * `provisional` is the important one. An unverified row used to render
 * "92 / 100 Strong" in green with the caveat tucked away in a small pill at
 * the bottom of the card, which read as authoritative. When the row is not
 * verified, the number itself is de-emphasised and labelled before it can be
 * read: grey digits, an amber PROVISIONAL tag sitting above them, and the band
 * word replaced by "Provisional".
 */
export default function ScoreDial({ score, coverage, size = 'md', provisional = false, className = '' }) {
  const b = band(score)
  const big = size === 'lg'
  const color = { good: 'text-good', mixed: 'text-mixed', bad: 'text-bad' }[b.tone]
  const numberColor = provisional ? 'text-ink-faint' : color
  const bandColor = provisional ? 'text-mixed' : color

  return (
    <div className={className}>
      {provisional && (
        <p className="mb-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-mixed">
          Provisional
        </p>
      )}
      <div className="flex items-baseline gap-2">
        <span
          className={`${big ? 'text-4xl' : 'text-2xl'} font-semibold tabular-nums ${numberColor} ${
            provisional ? 'decoration-mixed/50 decoration-dotted underline-offset-4 underline' : ''
          }`}
          title={provisional ? 'Arithmetic over unverified fields. Not a verdict on this company.' : undefined}
        >
          {score}
        </span>
        <span className="text-xs text-ink-faint">/ 100</span>
        <span className={`ml-auto text-xs font-medium ${bandColor}`}>
          {provisional ? 'unverified' : b.label}
        </span>
      </div>
      <div className="mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className={`h-full rounded-full ${provisional ? 'bg-ink/30' : 'bg-ink/70'}`}
            style={{ width: `${coverage}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">
          Coverage {coverage}% — {coverage === 100 ? 'all tracked fields answered' : 'some fields still unanswered'}
        </p>
      </div>
    </div>
  )
}
