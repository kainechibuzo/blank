import { COMPARE_FILTERS } from '../lib/compare.js'

/**
 * FilterRail — the five things people actually care about.
 *
 * Checkboxes, because a filter is a yes/no about yourself, and a dropdown would
 * make someone open a menu to answer a question they already know the answer to.
 *
 * Rendered once and placed either in a sidebar (desktop) or a bottom sheet
 * (mobile), so the two can never drift into offering different filters.
 */
export default function FilterRail({ active, onToggle, onReset, idPrefix = 'f' }) {
  const anyActive = active.length > 0

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          Only show tools where
        </h2>
        {/* Always visible when a filter is active: one click clears everything,
            because hunting through five boxes to undo one thought is how people
            end up looking at results they did not mean to ask for. */}
        {anyActive ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex min-h-[44px] items-center text-sm text-accent hover:underline"
          >
            Reset filters
          </button>
        ) : null}
      </div>

      <ul className="mt-2 space-y-1">
        {COMPARE_FILTERS.map((f) => {
          const id = `${idPrefix}-${f.id}`
          const on = active.includes(f.id)
          return (
            <li key={f.id}>
              <label
                htmlFor={id}
                className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-line/20"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(f.id)}
                  className="h-5 w-5 shrink-0 rounded border-line-strong accent-accent"
                />
                <span className="text-[15px] text-ink">{f.label}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
