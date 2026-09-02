import { Link } from 'react-router-dom'
import { scoreTool } from '../lib/scoring.js'
import { KEY_FIELDS, PLAIN_FIELDS, plainLabel } from '../lib/plain-labels.js'
import { stateForField } from '../lib/field-states.js'
import ScoreBar from './ScoreBar.jsx'
import FieldState from './FieldState.jsx'

/**
 * ComparisonRow — one row, expandable in place.
 *
 * CONSTRAINT 5: expanding a row is inline. No navigation, no modal, no new tab.
 * Only one row is open at a time, and the page owns which one — comparing two
 * tools side by side is what the individual tool pages are for. This page is
 * for filtering, not deep reading.
 *
 * The two chips on the collapsed row are always the same two fields, because a
 * table whose columns change per row is not a table: you cannot compare across
 * it. The expanded state shows all seven.
 */
export default function ComparisonRow({ tool, rank, expanded, onToggle }) {
  const s = scoreTool(tool)
  const panelId = `row-panel-${tool.id}`
  const buttonId = `row-button-${tool.id}`

  return (
    <li className="rounded-lg border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <span className="w-6 shrink-0 text-right font-mono text-xs text-ink-faint">{rank}</span>

        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-paper font-mono text-[11px] font-semibold text-ink-soft"
        >
          {tool.monogram ?? tool.name?.slice(0, 2)}
        </span>

        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate text-sm font-medium text-ink">{tool.name}</p>
          <p className="truncate text-xs text-ink-faint">
            {tool.category_label} · {tool.hq}
          </p>
        </div>

        {/* Two fixed columns, so the eye can run down them. */}
        <div className="flex shrink-0 flex-wrap gap-2">
          {KEY_FIELDS.map((key) => (
            <Chip key={key} tool={tool} fieldKey={key} />
          ))}
        </div>

        <ScoreBar
          score={s.score}
          coverage={s.coverage}
          read={s.read}
          total={s.total}
          className="shrink-0"
        />

        <button
          type="button"
          id={buttonId}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="inline-flex min-h-[44px] shrink-0 items-center px-2 text-sm text-ink-soft hover:text-ink"
        >
          {expanded ? 'Hide' : 'Full breakdown'}
          <span aria-hidden="true" className="ml-1">
            {expanded ? '▲' : '▼'}
          </span>
        </button>
      </div>

      {expanded ? (
        <div id={panelId} aria-labelledby={buttonId} className="border-t border-line p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {PLAIN_FIELDS.map(({ key, label }) => (
              <FieldState
                key={key}
                fieldKey={key}
                field={tool.fields?.[key]}
                label={label}
              />
            ))}
          </div>

          <p className="mt-3">
            <Link
              to={`/tools/${tool.id}`}
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-accent hover:underline"
            >
              Full tool page →
            </Link>
          </p>
        </div>
      ) : null}
    </li>
  )
}

/**
 * The collapsed chip: glyph, plain-word verdict, and nothing else.
 *
 * No source link here — there is no room, and the expanded row links every
 * field. A chip that cannot show its provenance shows no claim that needs it.
 */
function Chip({ tool, fieldKey }) {
  const field = tool.fields?.[fieldKey]
  const state = stateForField(fieldKey, field)

  if (state === null) {
    return (
      <span className="rounded-md border-2 border-dashed border-mixed/60 px-2 py-1 text-xs text-mixed">
        {plainLabel(fieldKey)} — unmapped value
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1 text-xs text-ink-soft"
      title={plainLabel(fieldKey)}
    >
      <span aria-hidden="true">{glyphFor(state)}</span>
      {shortVerdict(state)}
      <span className="sr-only">{plainLabel(fieldKey)}</span>
    </span>
  )
}

function glyphFor(state) {
  return (
    {
      SAFE_BY_DEFAULT: '●',
      OPT_OUT_EXISTS: '◐',
      NO_REMEDY: '✕',
      UNKNOWN: '○',
      NOT_READ_YET: '▢',
    }[state] ?? '▢'
  )
}

function shortVerdict(state) {
  return (
    {
      SAFE_BY_DEFAULT: 'Safe',
      OPT_OUT_EXISTS: 'Opt-out',
      NO_REMEDY: 'No remedy',
      UNKNOWN: "Doesn't say",
      NOT_READ_YET: 'Not read',
    }[state] ?? 'Not read'
  )
}
