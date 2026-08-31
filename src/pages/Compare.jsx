import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TOOLS } from '../data/tools.js'
import { SORTS, FILTER_BY_ID, CATEGORIES } from '../data/schema.js'
import { rankTools, encodeState, decodeState } from '../lib/filters.js'
import FilterRail from '../components/FilterRail.jsx'
import Collapsible from '../components/Collapsible.jsx'
import ToolCard from '../components/ToolCard.jsx'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

export default function Compare() {
  const [params, setParams] = useSearchParams()
  const state = decodeState(params)
  const [copied, setCopied] = useState(false)

  const results = useMemo(
    () => rankTools(TOOLS, { filters: state.filters, category: state.category, sort: state.sort }),
    [state.filters, state.category, state.sort]
  )

  const update = (next) => setParams(encodeState(next), { replace: true })

  const toggleFilter = (id) => {
    const filters = state.filters.includes(id)
      ? state.filters.filter((x) => x !== id)
      : [...state.filters, id]
    update({ ...state, filters })
  }

  const toggleCategory = (id) => {
    const current = state.category ?? []
    const category = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    update({ ...state, category: category.length ? category : null })
  }

  const share = async () => {
    const url = `${window.location.origin}/compare?${encodeState(state)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Comparison</h1>
        <p className="mt-2 text-ink-soft">
          Every filter here is a plain predicate over the tracked fields. The chat on{' '}
          <Link to="/discover" className="text-accent underline underline-offset-2">
            Discover
          </Link>{' '}
          calls this exact page’s ranking function, so you can always check its work by hand.
        </p>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[260px_1fr]">
        {/* On a phone the whole filter column folds away behind one row that
            still reports how many filters are on, so the results stay visible
            without scrolling past eleven checkboxes. */}
        <Collapsible
          title="Filters"
          count={state.filters.length + (state.category?.length ?? 0)}
          countLabel=" on"
          className="space-y-4"
          contentClassName="space-y-4"
        >
          <FilterRail
            tools={TOOLS}
            active={state.filters}
            onToggle={toggleFilter}
            onClear={() => update({ ...state, filters: [] })}
          />

          <div className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink">Category</h2>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CATEGORIES).map(([id, label]) => {
                const on = (state.category ?? []).includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleCategory(id)}
                    className={`rounded-full border px-2.5 py-1.5 text-xs sm:px-2 sm:py-1 ${
                      on ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-soft hover:border-ink-faint'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </Collapsible>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-sm text-ink">
              <strong className="tabular-nums">{results.length}</strong> of {TOOLS.length} tools match
            </p>
            {state.filters.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {state.filters.map((id) => (
                  <button key={id} onClick={() => toggleFilter(id)} title="Remove this filter">
                    <Pill tone="accent" className="hover:line-through">
                      {FILTER_BY_ID[id]?.label ?? id} ×
                    </Pill>
                  </button>
                ))}
              </div>
            )}
            {/* Wraps, and the select is capped: a <select> will not shrink
                below its longest option, so "Most recently verified" plus the
                label and the copy button used to push past a phone screen. */}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <label htmlFor="sort" className="text-xs text-ink-faint">
                Sort
              </label>
              <select
                id="sort"
                value={state.sort}
                onChange={(e) => update({ ...state, sort: e.target.value })}
                className="min-h-[38px] max-w-[11rem] rounded-md border border-line bg-white px-2 py-1.5 text-xs text-ink sm:min-h-0 sm:max-w-none sm:py-1 sm:text-sm"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={share}
                className="min-h-[38px] rounded-md border border-line px-2 py-1.5 text-xs text-ink-soft hover:border-ink-faint sm:min-h-0 sm:py-1"
              >
                {copied ? 'Link copied' : 'Copy link'}
              </button>
            </div>
          </div>

          {results.length === 0 ? (
            <Callout variant="warn" title="Nothing matches that combination">
              That is a real answer, not a failure. Untick a filter to see what’s excluding
              everything, or read{' '}
              <Link to="/methodology" className="underline underline-offset-2">
                why so many fields are unknown
              </Link>
              .
            </Callout>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((t, i) => (
                <ToolCard key={t.id} tool={t} rank={i + 1} compact />
              ))}
            </div>
          )}

          {results.length > 0 && (
            <p className="mt-4 text-xs text-ink-faint">
              Ranked by transparency score, then coverage. Every row is draft data; scores are
              arithmetic over unverified fields, not a verdict on the company.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
