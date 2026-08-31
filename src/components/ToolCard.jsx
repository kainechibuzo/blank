import { Link } from 'react-router-dom'
import { FIELDS } from '../data/schema.js'
import { scoreTool } from '../lib/scoring.js'
import Monogram from './Monogram.jsx'
import Pill from './Pill.jsx'
import ScoreDial from './ScoreDial.jsx'
import VerificationBadge from './VerificationBadge.jsx'

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

export default function ToolCard({ tool, rank, matched = [], compact = false }) {
  const s = scoreTool(tool)
  const verified = tool.verification.status === 'verified'

  return (
    <article
      className={`flex h-full flex-col rounded-lg border p-4 transition-shadow hover:shadow-sm ${
        verified
          ? 'border-line bg-paper-raised'
          : // Whole-card treatment, not one small pill: hatched wash, amber
            // border and edge, so a draft row reads as provisional at a glance.
            'hatch hatch-edge border-mixed/40 bg-paper-raised'
      }`}
    >
      {/* Sits above the score, so the caveat lands before the number does. */}
      {!verified && (
        <p className="-mx-4 -mt-4 mb-3 rounded-t-lg hatch border-b border-mixed/30 px-4 py-1.5 text-[11px] font-medium text-mixed">
          Draft — unverified · placeholder score
        </p>
      )}

      <div className="flex items-start gap-3">
        <Monogram tool={tool} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {rank ? <span className="font-mono text-xs text-ink-faint">#{rank}</span> : null}
            <h3 className="truncate text-base font-semibold text-ink">
              <Link to={`/tools/${tool.id}`} className="hover:underline">
                {tool.name}
              </Link>
            </h3>
          </div>
          <p className="truncate text-xs text-ink-faint">
            {tool.vendor} · {tool.category_label} · {tool.hq}
          </p>
        </div>
        <div className="w-28 shrink-0">
          <ScoreDial score={s.score} coverage={s.coverage} provisional={!verified} />
        </div>
      </div>

      {!compact && <p className="mt-3 text-sm text-ink-soft">{tool.blurb}</p>}

      <dl className="mt-3 grid gap-1.5">
        {SUMMARY_FIELDS.map((key) => (
          <div key={key} className="flex items-center justify-between gap-2 text-xs">
            <dt className="text-ink-faint">{FIELDS[key].label}</dt>
            <dd>
              <Pill tone={tone(key, tool)} muted={!verified}>
                {shortValue(key, tool)}
              </Pill>
            </dd>
          </div>
        ))}
      </dl>

      {matched.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
          <span className="text-[11px] text-ink-faint">Matched:</span>
          {matched.map((id) => (
            <Pill key={id} tone="accent" muted={!verified}>
              {id.replace(/_/g, ' ')}
            </Pill>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <VerificationBadge tool={tool} showAge={false} />
        <Link to={`/tools/${tool.id}`} className="text-xs font-medium text-accent hover:underline">
          Full breakdown →
        </Link>
      </div>
    </article>
  )
}
