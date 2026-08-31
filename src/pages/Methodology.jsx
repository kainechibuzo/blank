import { Link } from 'react-router-dom'
import { FIELDS, FIELD_ORDER, FILTERS, SITE } from '../data/schema.js'
import { DATASET_META } from '../data/tools.js'
import { POINTS, MAX, SCORE_BANDS } from '../lib/scoring.js'
import { traceabilitySummary } from '../lib/traceability.js'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'
import Collapsible from '../components/Collapsible.jsx'

const OPEN_QUESTIONS = [
  {
    q: 'Who verifies accuracy, and how often?',
    a: 'This is the real ongoing cost of the business — not hosting, not inference. Phase 1 assumes the founder reads every policy, with a target re-read window of 90 days and a hard re-read whenever a policy hash changes. Unresolved: what happens when the tool count makes one person the bottleneck.',
  },
  {
    q: 'Legal exposure of interpreting ToS language',
    a: 'Mitigation is paraphrase-only: describe the effect of a clause in plain English, never reproduce it, never offer an interpretation as legal advice. Every row links to the source page so the reader can check. Unresolved: whether a disclaimer is sufficient in every jurisdiction, and whether provider pushback should be handled by a standing corrections process (it should).',
  },
  {
    q: 'Are “last verified” dates enough at launch, or are change alerts needed from day one?',
    a: 'Dates ship first; they are free and honest. Alerts need email infrastructure and a sending reputation, so they follow — initially as the local browser watchlist already on each tool page.',
  },
  {
    q: 'What does an “unknown” mean to a reader?',
    a: 'Three different situations collapse into one word today: the policy is silent, the policy is ambiguous, or nobody has read it yet. Splitting these is a schema decision worth making before the first verified row ships.',
  },
]

const COSTS = [
  ['Hosting + database', '$20–50 / month', 'Static-hostable today; a DB only when alerts and accounts land.'],
  ['Domain', '~$15 / year', '—'],
  ['Initial extraction, 20 tools', '$10–30 one-off', 'LLM-assisted extraction, human-verified before publishing.'],
  ['Ongoing freshness', 'near zero + founder time', 'Weekly hash checks are cheap; only changed pages trigger re-extraction.'],
  ['Chat discovery', 'variable', 'Deterministic parsing costs nothing; an LLM parser would scale with usage and needs rate limits before launch.'],
  ['ADUO review (Phase 2)', 'scales with submissions', 'Not with users.'],
  ['The real cost', 'founder hours', 'Reading policies and reviewing ADUO applications. No amount of infrastructure removes this.'],
]

export default function Methodology() {
  const trace = traceabilitySummary()

  return (
    <div className="space-y-7 sm:space-y-10">
      <header className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Methodology</h1>
        <p className="mt-2 text-ink-soft">
          How the data is produced, what the numbers mean, and — most importantly — what they do not
          mean yet.
        </p>
      </header>

      <Callout variant="warn" title="Current state of the dataset">
        {DATASET_META.tool_count} tools · {DATASET_META.verified_count} verified by a human · last
        verified: never. Every row is seeded to exercise the schema. Treat every number on this site
        as a placeholder until it says otherwise.
      </Callout>

<Collapsible title="The eight fields, and why these eight" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink">        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Each field is a question a person actually asks before typing something sensitive into a
          box. Scope discipline matters: every extra field is permanent verification labour, and
          verification labour is the cost of this business.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Field</th>
                <th className="px-4 py-2 font-medium">What it answers</th>
                <th className="px-4 py-2 font-medium">Max points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {FIELD_ORDER.map((key) => (
                <tr key={key}>
                  <td className="px-4 py-3 align-top font-medium text-ink">{FIELDS[key].label}</td>
                  <td className="px-4 py-3 align-top text-ink-soft">{FIELDS[key].plain}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs text-ink-faint">{MAX[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
</Collapsible>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Collapsible title="Scoring" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink">
          <div>
          <p className="mt-2 text-sm text-ink-soft">
            Fixed, public weights. Unknown scores zero — a blank row can never look good — but
            unknown is not treated as a bad act either, which is why coverage is displayed beside
            every score.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white">
            {FIELD_ORDER.filter((k) => POINTS[k]).map((key) => (
              <div key={key} className="border-b border-line px-4 py-2.5 last:border-0">
                <p className="text-xs font-medium text-ink">{FIELDS[key].label}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.entries(POINTS[key]).map(([value, points]) => (
                    <Pill
                      key={value}
                      tone={points === 0 ? 'unknown' : points >= MAX[key] * 0.8 ? 'good' : 'mixed'}
                    >
                      {FIELDS[key].options[value]?.short ?? value}: {points}
                    </Pill>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Bands: {SCORE_BANDS.map((b) => `${b.label} ≥ ${b.min}`).join(' · ')}. Residency scores 10
            when an EU/UK option exists, 4 when regions are stated but no EU option, 0 when unknown.
          </p>
          </div>
        </Collapsible>

        <Collapsible title="Staying fresh without re-scraping everything" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink">
          <div>
          <p className="mt-2 text-sm text-ink-soft">
            Re-extracting every policy on a schedule gets slower and more expensive with every tool
            added. Instead, a weekly job fetches each policy page, normalises it (scripts, styles,
            comments and whitespace stripped) and hashes it:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-white p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
{`npm run check:policy-hashes            # report only
node scripts/check-policy-hashes.mjs --save
node scripts/check-policy-hashes.mjs --only=chatgpt`}
          </pre>
          <p className="mt-3 text-sm text-ink-soft">
            Only rows whose hash changed go back into the expensive pipeline: LLM-assisted
            re-extraction, then a human confirms before anything publishes. A changed hash means “a
            human should look”, never “the policy changed” — pages embed tokens, timestamps and A/B
            copy, so false positives are expected.
          </p>
          <Callout variant="note" className="mt-3" title="Where this mechanism stops working">
            Hash checking only works on pages that exist and can be fetched — the core provider
            database. It does not extend to providers behind logins, and it is not the same as the
            Phase 2 snippet, which only works where the counterparty is cooperating.
          </Callout>
          </div>
        </Collapsible>
      </div>

<Collapsible title="Verification workflow" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink">        <ol className="mt-3 grid gap-3 sm:grid-cols-4">
          {[
            ['1. Collect', 'Record the policy pages that govern the product, per tier. Enterprise and consumer terms are often different documents.'],
            ['2. Extract', 'LLM-assisted pass over each page to fill the eight fields. Output is a draft, never a publication.'],
            ['3. Verify', 'A human reads the source, confirms or corrects each field, and signs the row. Only now can a date be attached.'],
            ['4. Watch', 'Weekly hash check. A change queues re-extraction and re-verification; the date resets or the row is marked stale.'],
          ].map(([title, body]) => (
            <li key={title} className="rounded-lg border border-line bg-white p-4">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
        <Callout variant="rule" className="mt-3" title="The rule that keeps this honest">
          A row is marked verified only when a named human has read the linked policy on the recorded
          date. Verification status and date are separate fields for a reason: a stale verified row is
          worse than an honest unknown.
        </Callout>
</Collapsible>

<Collapsible title="Rules enforced in code" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink" count={trace.passed} countLabel=" passing">        <p className="mt-2 text-sm text-ink-soft">
          Run <code className="font-mono text-xs">npm run check:traceability</code> in CI. These are
          the same checks shown on the Discover page.
        </p>
        <ul className="mt-3 space-y-2">
          {trace.checks.map((c) => (
            <li key={c.name} className="rounded-lg border border-line bg-white p-3">
              <div className="flex items-center gap-2">
                <Pill tone={c.pass ? 'good' : 'bad'}>{c.pass ? 'PASS' : 'FAIL'}</Pill>
                <span className="text-sm font-medium text-ink">{c.name}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-faint">{c.detail}</p>
            </li>
          ))}
        </ul>
</Collapsible>

<Collapsible title="Open questions" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink" count={OPEN_QUESTIONS.length} countLabel="">        <div className="mt-3 space-y-3">
          {OPEN_QUESTIONS.map((o) => (
            <div key={o.q} className="rounded-lg border border-line bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">{o.q}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{o.a}</p>
            </div>
          ))}
        </div>
</Collapsible>

<Collapsible title="Running cost" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink">        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <tbody className="divide-y divide-line">
              {COSTS.map(([item, cost, note]) => (
                <tr key={item}>
                  <td className="px-4 py-2.5 font-medium text-ink">{item}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{cost}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-faint">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
</Collapsible>

<Collapsible title="Explicitly not this product" collapseOnDesktop defaultOpen titleClassName="text-base font-semibold text-ink">        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">Developer API eligibility by country/status.</strong> “Can I
            even use this API as a student in Nigeria?” is a real question with a different schema and
            a different audience. Merging it would dilute both. Parked as a separate product, if at
            all.
          </li>
          <li>
            <strong className="text-ink">Product reviews.</strong> Quality is a separate axis (Phase
            2) and stays visually separate. A clean policy does not make a tool good.
          </li>
          <li>
            <strong className="text-ink">Personalisation and accounts.</strong> Filters are enough to
            start. Accounts arrive with alerts, not before.
          </li>
          <li>
            <strong className="text-ink">Legal interpretation.</strong> Paraphrase only. No clause is
            reproduced verbatim; no summary is advice about your situation.
          </li>
        </ul>
        <p className="mt-4 text-xs text-ink-faint">
          {FILTERS.length} filters · {SITE.phase} ·{' '}
          <Link to="/charter" className="text-accent underline underline-offset-2">
            the one rule →
          </Link>
        </p>
</Collapsible>
    </div>
  )
}
