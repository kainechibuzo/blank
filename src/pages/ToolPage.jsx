import { Link, useParams } from 'react-router-dom'
import { TOOLS } from '../data/tools.js'
import { FIELD_ORDER, SITE } from '../data/schema.js'
import { scoreTool } from '../lib/scoring.js'
import { toolLastReadOn } from '../lib/dataset-summary.js'
import { formatDate } from '../lib/format.js'
import ScoreBar from '../components/ScoreBar.jsx'
import FactRow from '../components/FactRow.jsx'
import { PLAIN_FIELDS, wordForNumber } from '../lib/plain-labels.js'
import NotFound from './NotFound.jsx'

/**
 * ToolPage — one tool, top to bottom, in the order a person needs it.
 *
 * Identity first, then the short version, then the seven facts, then the
 * caveats. A score appears exactly once, at the bottom of the identity block,
 * because a reader who came to find out what happens to their data should not
 * be met with a verdict about the company first.
 *
 * No comparisons, no "you might also like", no related tools, no affiliate
 * links. This page is a trust surface; everything commercial lives elsewhere.
 */
export default function ToolPage() {
  const { slug } = useParams()
  const tool = TOOLS.find((t) => t.id === slug)

  if (!tool) return <NotFound />

  const s = scoreTool(tool)
  const lastRead = toolLastReadOn(tool)

  /* If every field that was read came from one page, say so. If they came from
     several — which they usually do, because training lives on a help page and
     retention lives in a privacy policy — say the source is per fact, rather
     than implying one document covers everything. */
  const readSources = FIELD_ORDER.map((k) => tool.fields?.[k]?.source).filter(Boolean)
  const allOneSource = readSources.length > 0 && new Set(readSources).size === 1

  /* Pre-filled with what we already know — the tool, the date we read it, the
     date the report is made — and one empty field for the thing we do not. A
     form that asks the reader to restate what the page already says gets filled
     in less often. */
  const issueUrl = [
    `${SITE.repo}/issues/new`,
    '?title=' + encodeURIComponent(`Correction: ${tool.name}`),
    '&body=' +
      encodeURIComponent(
        [
          `Tool: ${tool.name}`,
          `Reported: ${new Date().toISOString().slice(0, 10)}`,
          `Source last read: ${lastRead ?? 'not read yet'}`,
          '',
          "What's wrong:",
          '',
          '',
          '---',
          'Please paste the sentence from the policy that corrects us, and link to it.',
        ].join('\n')
      ),
  ].join('')

  return (
    <article className="mx-auto max-w-2xl">
      {/* ── BLOCK 1 — identity ─────────────────────────────────────────── */}
      <Link
        to="/compare"
        className="inline-flex min-h-[44px] items-center text-sm text-ink-soft hover:text-ink"
      >
        <span aria-hidden="true" className="mr-1.5">
          ←
        </span>
        All tools
      </Link>

      <div className="mt-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-white font-mono text-base font-semibold text-ink-soft"
        >
          {tool.monogram ?? tool.name?.slice(0, 2)}
        </span>

        <h1 className="mt-4 font-serif text-4xl leading-tight text-ink">{tool.name}</h1>

        <p className="mt-1 text-sm text-ink-soft">
          by {tool.vendor} · {tool.category_label} · {tool.hq}
        </p>

        {/* The credibility line, and it is not a footnote. How recently we
            read this and how much of it we got through is the whole claim the
            page makes about itself. */}
        <p className="mt-4 border-l-2 border-accent pl-3 text-sm font-medium text-ink">
          Last read: {lastRead ? formatDate(lastRead) : 'not yet'}{' '}
          <span className="text-ink-faint">
            · {s.read}/{FIELD_ORDER.length} fields answered
          </span>
        </p>

        {/* Score is the LAST thing in the identity block. Checked by the
            traceability suite, which fails if anything numeric appears above
            it. */}
        <div className="mt-4 border-t border-line pt-4">
          <ScoreBar
            score={s.score}
            coverage={s.coverage}
            read={s.read}
            total={s.total}
          />
        </div>
      </div>

      {/* ── BLOCK 2 — the short version ────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-ink">The short version</h2>

        {tool.short_version ? (
          <p className="mt-3 text-lg leading-relaxed text-ink">{tool.short_version}</p>
        ) : (
          /* Not a blank, and not a placeholder box. The reader is told plainly
             that the summary is missing and pointed at the facts, which are
             there and sourced. */
          <p className="mt-3 rounded-lg border border-dashed border-line bg-white p-4 text-sm leading-relaxed text-ink-soft">
            Plain-English summary coming — read the {wordForNumber(FIELD_ORDER.length)} facts below
            for now.
          </p>
        )}
      </section>

      {/* ── BLOCK 3 — the seven facts ───────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-ink">
          The {wordForNumber(FIELD_ORDER.length)} facts
        </h2>
        <p className="mt-0.5 text-sm text-ink-faint">
          {allOneSource
            ? `All read from ${tool.vendor}'s own policy page.`
            : `Read from ${tool.vendor}'s policy pages — source linked per fact.`}
        </p>

        <ul className="mt-4 space-y-4">
          {PLAIN_FIELDS.map(({ key }) => (
            <FactRow key={key} tool={tool} fieldKey={key} readOn={lastRead} />
          ))}
        </ul>
      </section>

      {/* ── BLOCK 4 — footer ────────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-line pt-6">
        <p className="text-sm leading-relaxed text-ink-soft">
          Not legal advice. We paraphrase — we do not quote policy text verbatim. Policies change
          without notice.
        </p>

        <p className="mt-3">
          <a
            href={issueUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-accent hover:underline"
          >
            If you spot an error, tell us →
          </a>
        </p>

        <p className="mt-1 text-xs text-ink-faint">
          Opens a public issue on GitHub, pre-filled with the tool and today&rsquo;s date. The
          correction becomes part of the record rather than an email nobody else can check.
        </p>

        {/* Repeated on purpose. Someone who has just read seven facts and is
            deciding whether to trust them should not have to scroll back up to
            find out how old it is. */}
        <p className="mt-4 text-sm text-ink-soft">
          Last read: {lastRead ? formatDate(lastRead) : 'not yet'}
        </p>

        <p className="mt-2">
          <Link to="/methodology" className="text-sm font-medium text-accent hover:underline">
            How we read and score these →
          </Link>
        </p>
      </footer>
    </article>
  )
}
