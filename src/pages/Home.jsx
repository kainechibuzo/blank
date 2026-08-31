import { Link } from 'react-router-dom'
import { TOOLS, DATASET_META } from '../data/tools.js'
import { FIELDS, FIELD_ORDER, SITE } from '../data/schema.js'
import { scoreTool } from '../lib/scoring.js'
import ToolCard from '../components/ToolCard.jsx'
import Collapsible from '../components/Collapsible.jsx'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

const SIGNALS = [
  {
    name: 'Transparency score',
    live: true,
    body: 'How good the answers are, where they are known: training defaults, human review, retention, deletion, residency, tier differences. 0–100, computed from the fields on the tool page — no editorial judgement, no weighting per user.',
  },
  {
    name: 'Coverage',
    live: true,
    body: 'How much of the row is actually answered. A high score on a thin row is not a good tool, it is an unfinished reading. Shown next to every score, always.',
  },
  {
    name: 'Community signal',
    live: false,
    body: 'Whether real users think the tool is any good (Phase 2). Kept structurally separate: a tool can be honest and mediocre, or excellent and careless with data. These never merge into one number.',
  },
]

const STARTS = [
  {
    n: '1',
    title: 'Filter the comparison',
    body: 'Pick the things you actually care about — no training on your data, no human review, EU residency, a free tier that is not a different contract — and see which tools still stand.',
    links: [{ to: '/compare', label: 'Open the comparison' }],
  },
  {
    n: '2',
    title: 'Describe what you need',
    body: 'Say it in your own words instead of ticking boxes. You get the matching tools and, next to them, the exact filters it applied — so you can check its working.',
    links: [{ to: '/discover', label: 'Describe what you need' }],
  },
  {
    n: '3',
    title: 'Add a tool, or vouch for one',
    body: 'This is the only reason accounts exist. Submitting a tool proves you control its site; voting (Phase 2) is how real users weigh in. Neither touches a transparency score or any ranking.',
    links: [
      { to: '/directory/submit', label: 'Submit a tool' },
      { to: '/account', label: 'Sign in' },
    ],
  },
]

export default function Home() {
  const top = [...TOOLS].map((t) => ({ t, s: scoreTool(t) })).sort((a, b) => b.s.score - a.s.score)

  return (
    <div className="space-y-8 sm:space-y-12">
      <section className="max-w-3xl">
        <Pill tone="unknown" className="mb-4">
          Working title · pre-launch · draft data
        </Pill>
        <h1 className="text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
          What AI products actually do with your data, in plain English.
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          {DATASET_META.tool_count} major AI tools, eight facts each, read out of their own policies.
          Filter for what matters to you — no training on your data, no human review, EU residency, a
          free tier that isn’t a different contract.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/compare"
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90"
          >
            Open the comparison
          </Link>
          <Link
            to="/discover"
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-ink-faint"
          >
            Describe what you need
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          No account needed to read any of this. No analytics. No sponsored rankings —{' '}
          <Link to="/charter" className="underline underline-offset-2">
            the rule is written down
          </Link>
          .
        </p>
      </section>

      {/* New here? Three ways in, in the order people usually want them. */}
      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">Start here</h2>
        <p className="mt-1 text-sm text-ink-soft">Three ways in, depending on what you came for.</p>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {STARTS.map((s) => (
            <li key={s.title} className="flex flex-col rounded-lg border border-line bg-white p-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent-ink">
                {s.n}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {s.links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-sm font-medium text-accent underline underline-offset-2 hover:text-accent-ink"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">Three signals, never blended into one score</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {SIGNALS.map((s) => (
            <div
              key={s.name}
              className={`rounded-lg border p-4 ${s.live ? 'border-line bg-white' : 'border-dashed border-line bg-transparent'}`}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{s.name}</h3>
                {!s.live && (
                  <Pill tone="unknown" className="text-[10px]">
                    Phase 2
                  </Pill>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-ink">Eight facts, tracked for every tool</h2>
          <Link to="/methodology" className="text-sm text-accent hover:underline">
            Why these eight →
          </Link>
        </div>
        <Collapsible title="The eight fields" count={FIELD_ORDER.length} className="mt-4">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {FIELD_ORDER.map((key) => (
              <div key={key} className="border-t border-line pt-3">
                <dt className="text-sm font-medium text-ink">{FIELDS[key].label}</dt>
                <dd className="mt-0.5 text-sm text-ink-soft">{FIELDS[key].question}</dd>
              </div>
            ))}
          </dl>
        </Collapsible>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold text-ink">Highest-scoring rows right now</h2>
          <Link to="/compare" className="text-sm text-accent hover:underline">
            See all {DATASET_META.tool_count} →
          </Link>
        </div>
        <Callout variant="warn" className="mt-3" title="These numbers are placeholders">
          The dataset is seeded to exercise the schema. The ordering below reflects draft values that
          no human has confirmed. Do not screenshot it.
        </Callout>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.slice(0, 6).map(({ t }, i) => (
            <ToolCard key={t.id} tool={t} rank={i + 1} compact />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Callout variant="rule" title="What this is not">
          <ul className="list-disc space-y-1 pl-4">
            <li>Not a directory of every AI tool — {DATASET_META.scope}</li>
            <li>Not legal advice. Paraphrase only; nothing is quoted verbatim.</li>
            <li>Not a review site. Scores describe policies, not product quality.</li>
          </ul>
        </Callout>
        <Callout variant="note" title="What is deliberately parked">
          A separate idea — “can I even use this API as a student in Nigeria” — is a different schema
          and a different audience. It stays out so it doesn’t dilute this one.{' '}
          <Link to="/methodology" className="text-accent underline underline-offset-2">
            Full scope notes
          </Link>
        </Callout>
      </section>

      <p className="text-xs text-ink-faint">
        {SITE.name} is a working title on purpose. A name is a brand; a brand is a thing people offer
        to sponsor. Pick it later, deliberately.
      </p>
    </div>
  )
}
