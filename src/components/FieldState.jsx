import { STATES, stateForField, noRemedyCopy } from '../lib/field-states.js'
import { formatDate } from '../lib/format.js'

/**
 * FieldState — one policy fact.
 *
 * Every component that shows a policy fact composes from this, so no component
 * can quietly assume the fact is populated. Two of the five states exist
 * precisely to say that it is not, and NO_REMEDY exists to say something
 * worse: it is populated, and the answer is unwelcome.
 *
 * Enforced here, not left to callers:
 *
 *   - five states, four colours. Green safe, yellow act, orange no-remedy,
 *     grey unknown-or-unread. No red on a policy fact, ever.
 *   - every field ends with either a [Source ↗] link to the exact page that
 *     was read, or the words "No source read yet". Never a blank, because a
 *     fact with no provenance is not a fact.
 *   - UNKNOWN and NOT_READ_YET look different at a glance — circle versus
 *     square — so "their policy doesn't say" and "we haven't looked" cannot be
 *     confused without reading the label.
 *   - NO_REMEDY uses the system's only orange, and is the only thing that may.
 *   - colour never carries the meaning alone; every icon carries an aria-label
 *     and every state carries a visible text label.
 */

const TONE = {
  good: {
    wrap: 'border-good/30 bg-good-soft',
    icon: 'text-good',
  },
  mixed: {
    wrap: 'border-mixed/30 bg-mixed-soft',
    icon: 'text-mixed',
  },
  noremedy: {
    wrap: 'border-noremedy/30 bg-noremedy-soft',
    icon: 'text-noremedy',
  },
  unknown: {
    wrap: 'border-unknown/30 bg-unknown-soft',
    icon: 'text-unknown',
  },
}

/**
 * Preferred usage — hand it the field and its key and let it derive everything:
 *
 *   <FieldState fieldKey="trains_on_data" field={tool.fields.trains_on_data}
 *               label="Does it learn from your chats?" />
 *
 * Derived rather than passed, because a caller that passes `state` separately
 * from `value` can pass a state the value does not support. Explicit props are
 * still accepted for the test page and for hand-written copy.
 */
export default function FieldState({
  fieldKey,
  field,
  state,
  label,
  children,
  source,
  readOn,
  className = '',
}) {
  const derivedState = state ?? stateForField(fieldKey, field)
  const meta = STATES[derivedState] ?? STATES.NOT_READ_YET
  const tone = TONE[meta.tone] ?? TONE.unknown

  const derivedSource = source ?? field?.source ?? null
  const derivedReadOn = readOn ?? field?.read_on ?? null

  // For NO_REMEDY the sentence is fixed: it is a claim about what the policy
  // supports, not a summary a caller is free to soften.
  const body = children ?? noRemedyCopy(fieldKey, field?.value) ?? null

  return (
    <div
      className={`rounded-lg border p-3 ${tone.wrap} ${className}`}
      role="status"
      aria-label={`${label ?? 'Fact'}: ${meta.aria}`}
    >
      <div className="flex items-start gap-2">
        {/* aria-hidden on the glyph: the label beside it and the wrapper's
            aria-label both carry the same meaning, so the icon is decoration.
            Meaning never rests on colour or on a glyph alone. */}
        <span aria-hidden="true" className={`mt-0.5 text-sm leading-none ${tone.icon}`}>
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {label}
            <span className="ml-2 text-xs font-normal text-ink-faint">{meta.label}</span>
          </p>
          {body ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{body}</p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">{meta.blurb}</p>
          )}
          <Source source={derivedSource} readOn={derivedReadOn} />
        </div>
      </div>
    </div>
  )
}

/** A fact ends with provenance or with an admission. Never with nothing. */
function Source({ source, readOn }) {
  if (!source) {
    return <p className="mt-1.5 text-[11px] italic text-ink-faint">No source read yet</p>
  }
  return (
    <p className="mt-1.5 text-[11px] text-ink-faint">
      <a
        href={source}
        target="_blank"
        rel="noreferrer noopener"
        className="underline decoration-line underline-offset-2 hover:text-ink"
      >
        Source ↗
      </a>
      {readOn ? <span> · read {formatDate(readOn)}</span> : null}
    </p>
  )
}

export { formatDate }
