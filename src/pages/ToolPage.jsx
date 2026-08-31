import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TOOL_BY_ID } from '../data/tools.js'
import { FIELDS, FIELD_ORDER, VERIFICATION_STATUSES } from '../data/schema.js'
import { scoreTool } from '../lib/scoring.js'
import { toggleWatch, isWatched, getWatchlist } from '../lib/watchlist.js'
import Monogram from '../components/Monogram.jsx'
import Pill from '../components/Pill.jsx'
import ScoreDial from '../components/ScoreDial.jsx'
import Callout from '../components/Callout.jsx'
import SourceList from '../components/SourceList.jsx'
import VerificationBadge from '../components/VerificationBadge.jsx'

function residencySummary(r) {
  if (!r) return { short: 'Unknown', tone: 'unknown' }
  const regions = (r.regions ?? []).join(', ') || 'not stated'
  return {
    short: `${r.hq_jurisdiction ?? 'Unknown'} · ${regions}`,
    tone: r.eu_option ? 'good' : 'mixed',
  }
}

export default function ToolPage() {
  const { id } = useParams()
  const tool = TOOL_BY_ID[id]
  const [watched, setWatched] = useState(() => isWatched(id))

  if (!tool) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-ink">No such tool</h1>
        <p className="text-sm text-ink-soft">
          Nothing is tracked under <code className="font-mono">{id}</code>.{' '}
          <Link to="/compare" className="text-accent underline underline-offset-2">
            Back to the comparison
          </Link>
          .
        </p>
      </div>
    )
  }

  const s = scoreTool(tool)
  const status = VERIFICATION_STATUSES[tool.verification.status]

  const onWatch = () => {
    toggleWatch(tool.id)
    setWatched(isWatched(tool.id))
  }

  return (
    <div className="space-y-8">
      <Link to="/compare" className="text-sm text-ink-faint hover:text-ink">
        ← Comparison
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        <Monogram tool={tool} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold text-ink">{tool.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {tool.vendor} · {tool.category_label} · {tool.hq}
          </p>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{tool.blurb}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <VerificationBadge tool={tool} />
            <a
              href={tool.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-accent underline underline-offset-2"
            >
              {new URL(tool.url).hostname}
            </a>
            <button
              onClick={onWatch}
              className={`rounded-full border px-2 py-1 text-xs ${
                watched ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-soft hover:border-ink-faint'
              }`}
              title="Saved in this browser only. No account, no email — the real alert tier comes later."
            >
              {watched ? '★ Watching (this browser)' : '☆ Watch for policy changes'}
            </button>
          </div>
        </div>
        <div className="w-40 rounded-lg border border-line bg-white p-3">
          <ScoreDial score={s.score} coverage={s.coverage} size="lg" />
        </div>
      </header>

      <Callout variant="warn" title={`${status.label} — ${status.blurb}`}>
        Every value below was entered to exercise the schema. A reviewer has to read the linked
        policy pages, confirm or correct each field, and only then can this row be marked verified
        and given a date.
      </Callout>

      <section>
        <h2 className="text-lg font-semibold text-ink">The eight fields</h2>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
          {FIELD_ORDER.map((key) => {
            const def = FIELDS[key]
            const field = tool.fields[key]
            const isResidency = key === 'residency'
            const option = isResidency ? null : def.options[field.value]
            const summary = isResidency ? residencySummary(field) : null
            const breakdown = s.breakdown.find((b) => b.key === key)

            return (
              <div key={key} className="grid gap-3 p-4 sm:grid-cols-[220px_1fr]">
                <div>
                  <h3 className="text-sm font-medium text-ink">{def.label}</h3>
                  <p className="mt-0.5 text-xs text-ink-faint">{def.question}</p>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isResidency ? (
                      <Pill tone={summary.tone}>{summary.short}</Pill>
                    ) : (
                      <Pill tone={option?.tone ?? 'unknown'}>{option?.label ?? 'Unknown'}</Pill>
                    )}
                    <span className="font-mono text-[11px] text-ink-faint">
                      {breakdown.points}/{breakdown.max} pts
                    </span>
                    {!breakdown.answered && (
                      <Pill tone="unknown" title="Scored zero. Unknown is not the same as bad, but it is not free.">
                        unanswered
                      </Pill>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{def.plain}</p>
                  {field.note && (
                    <p className="mt-2 rounded border-l-2 border-mixed/50 bg-mixed-soft/60 px-3 py-2 text-xs text-mixed">
                      {field.note}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Score breakdown</h2>
          <ul className="mt-3 space-y-1.5">
            {s.breakdown.map((b) => (
              <li key={b.key} className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate text-ink-soft">{b.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={`block h-full rounded-full ${
                      b.tone === 'good' ? 'bg-good' : b.tone === 'mixed' ? 'bg-mixed' : b.tone === 'bad' ? 'bg-bad' : 'bg-unknown'
                    }`}
                    style={{ width: `${(b.points / b.max) * 100}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-ink-faint">
                  {b.points}/{b.max}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-faint">
            Weights are fixed and public: training 25, human review 20, deletion 15, retention 15,
            residency 10, tier parity 10, enterprise terms 5. Unknown scores zero and is reported
            separately as coverage.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-white p-4">
            <h2 className="text-sm font-semibold text-ink">Sources a reviewer must read</h2>
            <div className="mt-3">
              <SourceList sources={tool.policy_sources} tool={tool} />
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-line bg-transparent p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">Community signal</h2>
              <Pill tone="unknown">Phase 2</Pill>
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              Nothing here yet, and deliberately so. Upvotes and reviews answer “is this tool any
              good”, which is a different question from “is it honest with my data”. They will be
              shown side by side and never added together.
            </p>
          </div>
        </div>
      </section>

      <Callout variant="note" title="How to read this page">
        Summaries are paraphrase only — no policy text is reproduced verbatim, and a paraphrase is
        not a legal interpretation. If a decision hinges on a clause, read the linked source. Nothing
        here is advice about your specific situation.
      </Callout>

      {getWatchlist().length > 0 && (
        <p className="text-xs text-ink-faint">
          You are watching {getWatchlist().length} tool{getWatchlist().length === 1 ? '' : 's'} in this
          browser. Saved locally; nothing leaves your device.
        </p>
      )}
    </div>
  )
}
