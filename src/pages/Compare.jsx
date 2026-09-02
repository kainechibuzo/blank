import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TOOLS } from '../data/tools.js'
import { applyFilters, encodeState, decodeState } from '../lib/filters.js'
import { COMPARE_SORTS, groupAndSort } from '../lib/compare.js'
import FilterRail from '../components/FilterRail.jsx'
import ComparisonRow from '../components/ComparisonRow.jsx'
import DescribeBox from '../components/DescribeBox.jsx'

/**
 * Compare — the full comparison, for people who want to go deeper.
 *
 * Reached from [Compare] in the nav, or "See all tools" from a result screen.
 * It is not the homepage any more; the homepage asks a question, this page
 * answers it across every tool at once.
 *
 * Grouping always wins over sorting. See groupAndSort in lib/compare.js.
 */
export default function Compare() {
  const [params, setParams] = useSearchParams()
  const state = decodeState(params)
  const [sort, setSort] = useState(state.sort === 'score' || state.sort === 'name' ? state.sort : 'coverage')
  /* Only one row open at a time. Comparing two tools side by side is what the
     individual tool pages are for — this page is for narrowing down, and a
     stack of expanded rows is a wall of text, not a comparison. */
  const [openId, setOpenId] = useState(null)
  /* Which filters came from free text, and the phrase that produced each one,
     so the row of chips can say why it is there. */
  const [derived, setDerived] = useState({})

  const results = useMemo(
    () => applyFilters(TOOLS, { filters: state.filters, category: state.category }),
    [state.filters, state.category]
  )

  const { groups, unmapped } = useMemo(() => groupAndSort(results, sort), [results, sort])

  // Sort lives in the URL with the filters, so a view can be copied out of the
  // address bar and arrive looking exactly the same.
  const update = (next) => setParams(encodeState({ ...next, sort }), { replace: true })

  const toggleFilter = (id) => {
    const filters = state.filters.includes(id)
      ? state.filters.filter((x) => x !== id)
      : [...state.filters, id]
    update({ ...state, filters })
  }

  const resetFilters = () => {
    setDerived({})
    update({ ...state, filters: [] })
  }

  const applyDerived = (filters, nextDerived) => {
    setDerived(nextDerived)
    update({ ...state, filters })
  }

  const removeFilter = (id) => {
    const next = { ...derived }
    delete next[id]
    setDerived(next)
    update({ ...state, filters: state.filters.filter((x) => x !== id) })
  }

  const shown = groups.reduce((n, g) => n + g.rows.length, 0)

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Compare every tool on what it does with your data
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Grouped by what happens to you — not by score. Sorting reorders inside a group and never
          moves a tool into a different one.
        </p>
      </header>

      <div className="mt-8 flex gap-8">
        {/* Desktop rail. The mobile equivalent is a bottom sheet (see
            FilterSheet) — same component, different container. */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterRail
            active={state.filters}
            onToggle={toggleFilter}
            onReset={resetFilters}
            idPrefix="rail"
          />
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{shown}</span> of {TOOLS.length} tools
              {state.filters.length ? ` · ${state.filters.length} filter${state.filters.length === 1 ? '' : 's'}` : ''}
            </p>

            <DescribeBox
              active={state.filters}
              derived={derived}
              onApply={applyDerived}
              onRemove={removeFilter}
            />

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="min-h-[44px] rounded-md border border-line bg-white px-2 text-sm text-ink"
              >
                {COMPARE_SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* A value stateForField cannot map is a bug in our schema. It is
              reported, not filed under a group. */}
          {unmapped.length > 0 ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border-2 border-dashed border-mixed/60 bg-mixed-soft p-3 text-sm text-mixed"
            >
              {unmapped.length} value{unmapped.length === 1 ? '' : 's'} we cannot classify:{' '}
              {unmapped.join(', ')}. Not shown as &ldquo;unknown&rdquo; — that would blame a provider
              for a gap in our own schema.
            </p>
          ) : null}

          <div className="mt-6 space-y-8">
            {groups.map((group) =>
              /* An empty group disappears entirely rather than rendering a
                 heading over nothing. */
              group.rows.length === 0 ? null : (
                <section key={group.id} aria-labelledby={`g-${group.id}`}>
                  <h2 id={`g-${group.id}`} className="font-serif text-lg text-ink">
                    {group.heading}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-faint">{group.sub}</p>

                  <ul className="mt-3 space-y-2">
                    {group.rows.map(({ tool }, i) => (
                      <ComparisonRow
                        key={tool.id}
                        tool={tool}
                        rank={i + 1}
                        expanded={openId === tool.id}
                        onToggle={() => setOpenId(openId === tool.id ? null : tool.id)}
                      />
                    ))}
                  </ul>
                </section>
              )
            )}
          </div>

          {shown === 0 ? (
            <p className="mt-8 rounded-lg border border-line bg-white p-4 text-sm text-ink-soft">
              No tool meets every filter you picked. Remove one to widen the results.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
