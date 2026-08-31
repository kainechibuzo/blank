import { FILTERS, FILTER_GROUPS } from '../data/schema.js'
import { applyFilters } from '../lib/filters.js'

/**
 * Counts are computed against the current result set so a user can see, before
 * clicking, which filters will empty the page. Zero-match filters stay visible
 * and clickable — hiding them would hide the fact that nothing qualifies.
 */
export default function FilterRail({ tools, active, onToggle, onClear }) {
  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.id, applyFilters(tools, { filters: [f.id] }).length])
  )

  return (
    <aside className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Filters</h2>
        {active.length > 0 && (
          <button onClick={onClear} className="text-xs text-accent hover:underline">
            Clear ({active.length})
          </button>
        )}
      </div>

      <div className="space-y-4">
        {FILTER_GROUPS.map((group) => (
          <fieldset key={group}>
            <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              {group}
            </legend>
            <div className="space-y-1.5">
              {FILTERS.filter((f) => f.group === group).map((f) => {
                const checked = active.includes(f.id)
                const n = counts[f.id]
                return (
                  <label
                    key={f.id}
                    title={f.help}
                    className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      checked ? 'bg-accent-soft' : 'hover:bg-paper'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(f.id)}
                      className="mt-0.5 h-3.5 w-3.5 accent-accent"
                    />
                    <span className="flex-1 leading-snug">
                      <span className={checked ? 'font-medium text-accent-ink' : 'text-ink'}>{f.label}</span>
                      <span className={`ml-1 font-mono text-[11px] ${n === 0 ? 'text-bad' : 'text-ink-faint'}`}>
                        {n}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
        Filters are additive: a tool must satisfy every box you tick. Numbers show how many of the{' '}
        {tools.length} tracked tools currently qualify.
      </p>
    </aside>
  )
}
