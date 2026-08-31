import { band } from '../lib/scoring.js'

/**
 * Score and coverage are always shown together and always separate.
 * A high score on a thin row is not a good tool — it is a row nobody has
 * finished reading.
 */
export default function ScoreDial({ score, coverage, size = 'md', className = '' }) {
  const b = band(score)
  const big = size === 'lg'
  const color = { good: 'text-good', mixed: 'text-mixed', bad: 'text-bad' }[b.tone]

  return (
    <div className={className}>
      <div className="flex items-baseline gap-2">
        <span className={`${big ? 'text-4xl' : 'text-2xl'} font-semibold tabular-nums ${color}`}>{score}</span>
        <span className="text-xs text-ink-faint">/ 100</span>
        <span className={`ml-auto text-xs font-medium ${color}`}>{b.label}</span>
      </div>
      <div className="mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ink/70" style={{ width: `${coverage}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">
          Coverage {coverage}% — {coverage === 100 ? 'all tracked fields answered' : 'some fields still unanswered'}
        </p>
      </div>
    </div>
  )
}
