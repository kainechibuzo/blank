import { STATES, NEEDS_DECISION } from '../lib/field-states.js'

/**
 * FieldState — one policy fact.
 *
 * Every component that shows a policy fact composes from this, so no component
 * can quietly assume the fact is populated. Two of the five states exist
 * precisely to say that it is not.
 *
 * Enforced here, not left to callers:
 *
 *   - three colours only. Green safe, yellow act, grey unknown-or-unread.
 *     No red on a policy fact, ever.
 *   - every field ends with either a [Source ↗] link to the exact page that
 *     was read, or the words "No source read yet". Never a blank, because a
 *     fact with no provenance is not a fact.
 *   - UNKNOWN and NOT_READ_YET look different at a glance — circle versus
 *     square — so "their policy doesn't say" and "we haven't looked" cannot be
 *     confused without reading the label.
 *   - colour never carries the meaning alone; every icon carries an aria-label.
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
  unknown: {
    wrap: 'border-unknown/30 bg-unknown-soft',
    icon: 'text-unknown',
  },
}

export default function FieldState({
  state,
  label,
  children,
  source,
  readOn,
  className = '',
}) {
  // A value with no honest state is not rendered as if it had one. It says so,
  // loudly, so it cannot reach a user looking like a decision we made.
  if (state === NEEDS_DECISION) {
    const meta = STATES.UNKNOWN
    return (
      <div
        className={`rounded-lg border-2 border-dashed border-mixed/60 bg-mixed-soft p-3 ${className}`}
        role="status"
      >
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className={`mt-0.5 text-sm ${TONE.mixed.icon}`}>
            {meta.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="mt-0.5 text-xs font-medium text-mixed">
              State not defined yet — this value needs a design decision, not a colour.
            </p>
            {children ? (
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{children}</p>
            ) : null}
            <Source source={source} readOn={readOn} />
          </div>
        </div>
      </div>
    )
  }

  const meta = STATES[state] ?? STATES.NOT_READ_YET
  const tone = TONE[meta.tone] ?? TONE.unknown

  return (
    <div
      className={`rounded-lg border p-3 ${tone.wrap} ${className}`}
      role="status"
      aria-label={`${label}: ${meta.aria}`}
    >
      <div className="flex items-start gap-2">
        {/* aria-hidden on the glyph: the label beside it and the wrapper's
            aria-label both carry the same meaning, so the icon is decoration. */}
        <span aria-hidden="true" className={`mt-0.5 text-sm leading-none ${tone.icon}`}>
          {meta.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {label}
            <span className="ml-2 text-xs font-normal text-ink-faint">{meta.label}</span>
          </p>
          {children ? (
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{children}</p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">{meta.blurb}</p>
          )}
          <Source source={source} readOn={readOn} />
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

/** "2 Sept 2026" — the format people actually read. */
export function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
