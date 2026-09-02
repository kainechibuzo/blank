import { useState } from 'react'
import { stateForField } from '../lib/field-states.js'
import { sentenceFor, noRemedySentenceFor } from '../lib/plain-english.js'
import { plainLabel } from '../lib/plain-labels.js'
import FieldState from './FieldState.jsx'

/**
 * FactRow — one tracked fact, as a reader needs it.
 *
 *   [plain question]  [FieldState: glyph, verdict, sentence]  [Source ↗]
 *   [How to do this — N steps ▾]   ← only when there are steps worth showing
 *
 * The sentence comes from plain-english.js, which keys on value before state, so
 * a value whose state would misdescribe it still gets honest copy.
 *
 * The accordion is conditional on three things at once: the state is one where
 * there is something to do, the dataset actually carries steps, and none of
 * those steps is a referral to support. Any one of them missing and the link is
 * absent rather than present-but-empty — an accordion that opens onto "contact
 * support" is worse than no accordion, because it looks like help.
 */
export default function FactRow({ tool, fieldKey, readOn }) {
  const [open, setOpen] = useState(false)
  const field = tool.fields?.[fieldKey]
  const state = stateForField(fieldKey, field)
  const label = plainLabel(fieldKey)

  // A value with no mapping is a bug in our schema. FieldState shouts about it;
  // here there is nothing further to add, so the row stops.
  if (state === null) {
    return (
      <li className="rounded-lg border-2 border-dashed border-mixed/60 bg-mixed-soft p-3">
        <p className="text-sm font-medium text-mixed">
          “{String(field?.value)}” on {label} has no state mapped — this is a bug, not a finding.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          It is deliberately not shown as unknown. Unknown is a claim about a policy we read; this
          is a gap in our own code.
        </p>
      </li>
    )
  }

  const sentence =
    state === 'NO_REMEDY'
      ? noRemedySentenceFor(fieldKey, field?.value)
      : sentenceFor(fieldKey, state, field?.value)

  const steps = Array.isArray(field?.steps) ? field.steps : []
  const actionableState = state === 'OPT_OUT_EXISTS' || state === 'SAFE_BY_DEFAULT'
  const stepsUsable = steps.length > 0 && !steps.some((s) => /contact\s+(support|us)/i.test(String(s)))
  const showSteps = actionableState && stepsUsable

  return (
    <li>
      <FieldState
        fieldKey={fieldKey}
        field={field}
        state={state}
        label={label}
        readOn={readOn}
      >
        {sentence}
      </FieldState>

      {showSteps ? (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={`steps-${tool.id}-${fieldKey}`}
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-accent hover:underline"
          >
            How to do this — {steps.length} step{steps.length === 1 ? '' : 's'}
            <span aria-hidden="true" className="ml-1">
              {open ? '▲' : '▼'}
            </span>
          </button>

          {open ? (
            <ol
              id={`steps-${tool.id}-${fieldKey}`}
              className="mt-2 list-decimal space-y-1 pl-6 text-sm text-ink-soft"
            >
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
