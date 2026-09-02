import { useState } from 'react'
import { planQuery } from '../lib/chat.js'
import { COMPARE_FILTERS, COMPARE_FILTER_IDS } from '../lib/compare.js'

/**
 * DescribeBox — say what you need in your own words, then see exactly what we
 * understood.
 *
 * THE BOUNDARY (docs/08-llm-boundary.md): turning language into filter chips is
 * input parsing. Matching and ranking is planQuery, which is deterministic and
 * has no model anywhere in it. The chips are the seam between the two, and
 * they are here so the parse is checkable rather than trusted.
 *
 * This implementation parses with planQuery — a keyword lexicon — rather than
 * calling a model. It costs nothing, runs offline, and every chip can name the
 * exact phrase that produced it. A model can replace the lexicon later without
 * touching anything below this component, because everything downstream only
 * ever sees filter ids.
 *
 * Every chip carries the phrase that produced it and can be removed on its own.
 * That is the "check its working" promise, and it is why the feature exists: a
 * filter you cannot inspect is a filter you cannot correct.
 */
export default function DescribeBox({ active, derived, onApply, onRemove }) {
  const [text, setText] = useState('')
  const [openPhrase, setOpenPhrase] = useState(null)
  const [emptyMatch, setEmptyMatch] = useState(false)

  function submit(e) {
    e.preventDefault()
    const q = text.trim()
    if (!q) return

    const plan = planQuery(q)

    // planQuery has two shapes. When it is confident it returns `filters`
    // directly; when it would rather ask a clarifying question it returns the
    // filters it already understood under `partial`. The compare page never
    // asks questions — it shows what it has and lets the chips be corrected —
    // so both shapes are read the same way here.
    const filters = plan.kind === 'ask' ? (plan.partial?.filters ?? []) : (plan.filters ?? [])

    /* The lexicon knows more filters than this page offers — `free_tier_exists`
       and `enterprise_no_training` among them. A chip outside the five would
       render with its raw id, and could not be re-ticked once removed, because
       the rail does not contain it. So derived filters are restricted to the
       same vocabulary the checkboxes speak. */
    const usable = filters.filter((id) => COMPARE_FILTER_IDS.includes(id))

    /* A provenance string, stored whole rather than assembled at render time,
       because assembling it later is how the use-case form ends up wearing the
       phrase form's quotation marks. */
    const nextDerived = {}
    for (const id of usable) nextDerived[id] = 'inferred from your wording'

    for (const m of plan.matched ?? []) {
      if (!COMPARE_FILTER_IDS.includes(m.filterId)) continue
      nextDerived[m.filterId] = `matched “${m.terms.join('”, “')}”`
    }

    // Use-case bundles add filters the text never named — "journaling" implies
    // no training, no human review, and deletability. Those are still
    // attributed, because "we inferred this from a bundle" is a reason a person
    // is entitled to see and reject.
    if (plan.useCase) {
      for (const f of plan.useCase.filters ?? []) {
        if (!COMPARE_FILTER_IDS.includes(f)) continue
        if (nextDerived[f] === 'inferred from your wording') {
          nextDerived[f] = `inferred from “${plan.useCase.label}”`
        }
      }
    }

    setEmptyMatch(usable.length === 0)
    onApply(usable, nextDerived)
  }

  const labelFor = (id) => COMPARE_FILTERS.find((f) => f.id === id)?.label ?? id

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <form onSubmit={submit}>
        <label htmlFor="describe-input" className="text-sm font-medium text-ink">
          Describe what you need
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="describe-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. something private for journaling that won't train on it"
            className="min-h-[48px] flex-1 rounded-md border border-line bg-white px-3 text-base text-ink placeholder:text-ink-faint"
          />
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft"
          >
            Find tools
          </button>
        </div>
      </form>

      {emptyMatch ? (
        <p className="mt-3 text-sm text-ink-soft">
          Nothing in that wording matched a filter. Tick a box above instead, or try
          &ldquo;no training&rdquo;, &ldquo;no human review&rdquo;, &ldquo;EU&rdquo;.
        </p>
      ) : null}

      {/* Every active filter, not just the derived ones: the row is the
          complete statement of what is being asked for, so a person can see
          all of it in one place and remove any of it. */}
      {active.length > 0 ? (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs text-ink-faint">
            {active.length} filter{active.length === 1 ? '' : 's'} applied
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {active.map((id) => {
              const phrase = derived[id]
              // Three different provenances, and the difference matters: a
              // filter we can name the phrase for, a filter we inferred from
              // the wording, and a filter the person ticked themselves. Calling
              // the second one "ticked by you" would be a small lie about who
              // asked for it.
              const inferred = Object.prototype.hasOwnProperty.call(derived, id)
              // Stored whole at parse time; this only distinguishes a derived
              // filter from one the person ticked themselves.
              const provenance = inferred ? phrase : 'ticked by you'
              const open = openPhrase === id
              return (
                <li
                  key={id}
                  className="flex items-center gap-1 rounded-full border border-line bg-paper py-1 pl-3 pr-1"
                >
                  <span className="text-sm text-ink">{labelFor(id)}</span>

                  {phrase || inferred ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpenPhrase(open ? null : id)}
                        aria-expanded={open}
                        title={provenance}
                        aria-label={`Why was this filter added? ${provenance}`}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-ink-faint hover:bg-line/40 hover:text-ink"
                      >
                        <span aria-hidden="true">ⓘ</span>
                      </button>
                      {open ? <span className="text-xs text-ink-faint">{provenance}</span> : null}
                    </>
                  ) : (
                    <span className="text-xs text-ink-faint">· ticked by you</span>
                  )}

                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    aria-label={`Remove filter: ${labelFor(id)}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-faint hover:bg-line/40 hover:text-ink"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
