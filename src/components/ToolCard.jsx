import { Link } from 'react-router-dom'
import { FIELDS } from '../data/schema.js'
import { scoreTool } from '../lib/scoring.js'
import Monogram from './Monogram.jsx'
import Pill from './Pill.jsx'
import ScoreDial from './ScoreDial.jsx'
import VerificationBadge from './VerificationBadge.jsx'
import { toolHref } from '../lib/urls.js'

function shortValue(key, tool) {
  if (key === 'residency') {
    const r = tool.fields.residency
    return r.eu_option ? `${r.hq_jurisdiction} · EU option` : r.hq_jurisdiction || 'Unknown'
  }
  const v = tool.fields[key].value
  return FIELDS[key].options[v]?.short ?? 'Unknown'
}

function tone(key, tool) {
  if (key === 'residency') return tool.fields.residency.eu_option ? 'good' : 'neutral'
  const v = tool.fields[key].value
  return FIELDS[key].options[v]?.tone ?? 'unknown'
}

const SUMMARY_FIELDS = ['trains_on_data', 'human_review', 'deletion']

/**
 * Layout notes, both learned the hard way on a phone:
 *  - the score stacks under the name below sm. Squeezing a 112px dial beside a
 *    name in a 288px card clipped the number and pushed pills off the edge.
 *  - every row wraps. A pill with a long label beside a long question used to
 *    have nowhere to go but off the right of the screen.
 */
export default function ToolCard({ tool, rank, matched = [], compact = false }) {
  const s = scoreTool(tool)
  const verified = tool.verification.status === 'verified'

  return (
    <article
      className={`flex h-full flex-col rounded-lg border p-4 transition-shadow hover:shadow-sm ${
        verified
          ? 'border-line bg-paper-raised'
          : // A solid amber edge and one labelled strip. Not a striped wash:
            // that made the least trustworthy rows the loudest thing on the
            // page.
            'hatch-edge border-mixed/40 bg-paper-raised'
      }`}
    >
      {/* Says the state once, above the number. Everything else stays quiet —
          the score is greyed, the pills are outlined, and the status pill in
          the footer is dropped for draft rows so the same caveat is not
          printed three times on one card. */}
      {!verified && (
        <p className="-mx-4 -mt-4 mb-3 rounded-t-lg border-b border-mixed/30 bg-mixed-soft px-4 py-1.5 text-[11px] font-medium text-mixed">
          Draft — unverified · placeholder score
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Monogram tool={tool} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {rank ? <span className="font-mono text-xs text-ink-faint">#{rank}</span> : null}
              <h3 className="truncate text-base font-semibold text-ink">
                <Link to={toolHref(tool)} className="hover:underline">
                  {tool.name}
                </Link>
              </h3>
            </div>
            <p className="truncate text-xs text-ink-faint">
              {tool.vendor} · {tool.category_label} · {tool.hq}
            </p>
          </div>
        </div>

        <div className="w-full shrink-0 border-t border-line pt-3 sm:w-28 sm:border-0 sm:pt-0">
          <ScoreDial score={s.score} coverage={s.coverage} provisional={!verified} badge={false} />
        </div>
      </div>

      {!compact && <p className="mt-3 text-sm text-ink-soft">{tool.blurb}</p>}

      <dl className="mt-3 grid gap-2">
        {SUMMARY_FIELDS.map((key) => (
          <div key={key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <dt className="min-w-0 text-ink-faint">{FIELDS[key].label}</dt>
            <dd className="shrink-0">
              <Pill tone={tone(key, tool)} muted={!verified}>
                {shortValue(key, tool)}
              </Pill>
            </dd>
          </div>
        ))}
      </dl>

      {matched.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3">
          <span className="text-[11px] text-ink-faint">Matched:</span>
          {matched.map((id) => (
            <Pill key={id} tone="accent" muted={!verified}>
              {id.replace(/_/g, ' ')}
            </Pill>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
        {verified && <VerificationBadge tool={tool} showAge={false} />}
        <Link
          to={toolHref(tool)}
          className="ml-auto inline-flex min-h-[36px] items-center text-xs font-medium text-accent hover:underline"
        >
          Full breakdown →
        </Link>
      </div>
    </article>
  )
}
