import { STATES } from '../lib/field-states.js'

/**
 * ColourLegend — pinned to the bottom of the result screen, always visible.
 *
 * Pinned rather than placed at the end of the page, because the person reading
 * these cards will scroll past several tools before they hit a colour they do
 * not recognise, and having to scroll back up to decode it is where a legend
 * stops being a legend.
 *
 * NO_REMEDY (orange) is in here and was not in the original brief: the brief's
 * legend predates the state. Leaving it out would mean the one colour people
 * most want explained is the one colour missing from the explanation.
 */

const ROWS = [
  { state: 'SAFE_BY_DEFAULT', text: 'Safe by default — no action needed' },
  { state: 'OPT_OUT_EXISTS', text: "You can make it safer — but you have to do it yourself" },
  { state: 'NO_REMEDY', text: 'No remedy — we read it, the answer is bad, no setting fixes it' },
  { state: 'UNKNOWN', text: "Unknown — we read the policy, it doesn't say" },
  { state: 'NOT_READ_YET', text: "Not read yet — we haven't looked" },
]

export default function ColourLegend() {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
      <ul
        aria-label="What the colours mean"
        className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-1.5"
      >
        {ROWS.map(({ state, text }) => {
          const meta = STATES[state]
          const colour =
            meta.tone === 'good'
              ? 'text-good'
              : meta.tone === 'mixed'
                ? 'text-mixed'
                : meta.tone === 'noremedy'
                  ? 'text-noremedy'
                  : 'text-unknown'
          return (
            <li key={state} className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span aria-hidden="true" className={colour}>
                {meta.icon}
              </span>
              {text}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
