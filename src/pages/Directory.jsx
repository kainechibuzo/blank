import { Link } from 'react-router-dom'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

const THRESHOLDS = [
  ['Traffic trend', '≥ 15% month-on-month growth over 3 months, from a base of ≥ 1,000 monthly visits', 'Reliable only once a footprint exists — see the known gap below.'],
  ['External reviews', '≥ 10 off-site reviews with median sentiment ≥ 4/5, at least 3 of them substantive', 'Substance over volume; app stores and forums, not the tool’s own site.'],
  ['ToS / privacy score', '≥ 60 / 100 with coverage ≥ 70%', 'Drawn from Phase 1 data. An unverified row cannot qualify.'],
  ['Upvote ceiling', 'Fewer than 50 upvotes', 'Above this the listing is presumed able to compete on votes alone.'],
]

const WARNING_TEMPLATE = [
  'What changed — a commit-history-style log of what the bot found, with timestamps.',
  'What happens next — a human reviews before anything is removed. Nothing is automatic.',
  'What removal would mean, if the review finds tampering.',
  'How to contact support, with a real route and an expected response window.',
]

export default function Directory() {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border-2 border-dashed border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="unknown">Phase 2 — not live</Pill>
          <Pill tone="neutral">Nothing here accepts submissions yet</Pill>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          This page exists so the rules are written before the mechanism is built. It describes how
          the directory, ownership verification and ADUO will work — not what they do today, because
          today they do nothing.
        </p>
      </div>

      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold text-ink">Directory, verification &amp; ADUO</h1>
        <p className="mt-2 text-ink-soft">
          A separate axis, deliberately: a tool can have clean terms and still be mediocre, or be
          excellent and careless with your data. Phase 1 answers “is it honest”; this answers “is it
          any good”.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Submission &amp; ownership verification</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
            <li>The site or tool owner submits the product for listing.</li>
            <li>
              They add a small snippet to their site, Search-Console style. This proves control
              (basic KYC) and gives the review bot a defined route to crawl.
            </li>
            <li>
              The bot confirms the live site matches what was claimed at submission — a music site is
              actually a music site.
            </li>
          </ol>
          <Callout variant="rule" className="mt-3" title="Public crawl only">
            The snippet is the only thing added. No account credentials, no API keys, no backend
            access — never requested, never used. The owner controls it and can remove it themselves.
          </Callout>
        </div>

        <div className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Tamper detection</h2>
          <p className="mt-2 text-sm text-ink-soft">
            The snippet is re-checked <strong className="text-ink">weekly</strong>, not only at
            submission. If it is missing or altered, the owner gets a warning containing:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {WARNING_TEMPLATE.map((w) => (
              <li key={w} className="flex gap-2">
                <span className="text-accent">·</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
          <Callout variant="warn" className="mt-3" title="No auto-ban on first detection">
            Snippet breakage is usually innocent — a redesign, a CMS migration, someone cleaning up
            the header. A human reviews before any listing is removed.
          </Callout>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">ADUO — balance-of-performance boost</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Named after F1-style performance balancing: a listing with few upvotes but strong underlying
          signals gets extra visibility, so good undiscovered tools are not permanently buried under
          incumbents who won early and snowballed on raw vote count.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Signal</th>
                <th className="px-4 py-2 font-medium">Proposed threshold</th>
                <th className="px-4 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {THRESHOLDS.map(([signal, threshold, note]) => (
                <tr key={signal}>
                  <td className="px-4 py-3 font-medium text-ink">{signal}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{threshold}</td>
                  <td className="px-4 py-3 text-xs text-ink-faint">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout variant="warn" className="mt-3" title="These thresholds are unratified">
          Numbers are proposed, not decided. They must be ratified <strong>before the first grant</strong>,
          not after — deciding the bar once you can see who clears it is how a rule becomes a favour.
        </Callout>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ['Open application', 'Any submitter can apply, including big names, evaluated against the same fixed criteria. Never granted because a company is liked or wanted on the site.'],
            ['Low upvotes alone is never enough', 'A bad tool also has low upvotes. Traffic trend, external reviews and the ToS score are what separate “good, undiscovered” from “correctly ignored”.'],
            ['Disclosed on the listing', 'A deliberate, labelled exception to “ranking is never influenced outside votes”. Visible on the listing itself — never invisible.'],
            ['Founder-granted, criteria-bound', 'The founder applies the fixed criteria; this is not a licence to override them with personal judgement.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-line bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>

        <Callout variant="note" className="mt-3" title="Known gap">
          Traffic data is least reliable for exactly the earliest-stage tools ADUO is meant to help —
          they have no measurable footprint yet. For very early submissions, evaluate on reviews and
          ToS score alone and add traffic once it exists. Otherwise ADUO structurally cannot fire for
          the smallest, newest listings.
        </Callout>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-bad/30 bg-bad-soft p-4">
          <h2 className="text-sm font-semibold text-bad">Hard rules (same category as the one rule)</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>Review turnaround is never purchasable or expeditable.</li>
            <li>Ranking position and upvote counts are never purchasable or boostable.</li>
            <li>Upvote score and ToS transparency rating stay separate and clearly labelled — never one combined score.</li>
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Anti-gaming</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>Account age requirement plus captcha on voting.</li>
            <li>Upvotes decay daily, so a one-off bot pile-on cannot have a permanent effect.</li>
            <li>Submitters may run a promotion or vote campaign once per week, preventing repeated brigading.</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">Open questions, unresolved on purpose</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          <li>
            <strong className="text-ink">Manipulation beyond the measures above.</strong> Bot rings
            and coordinated voting are not solved by captchas and decay. This needs a real answer
            before the directory opens.
          </li>
          <li>
            <strong className="text-ink">What “verified” confirms.</strong> It proves control of a
            domain and that the site matches its claim. It is not a quality or safety endorsement,
            and the wording has to make that impossible to misread.
          </li>
          <li>
            <strong className="text-ink">Cost at scale.</strong> Weekly snippet re-checks on 20
            listings is trivial; at 2,000 it is a real recurring job with real bandwidth and politeness
            constraints.
          </li>
          <li>
            <strong className="text-ink">What “contact support” means.</strong> Early on it is the
            founder with an inbox. That should be stated plainly rather than dressed up.
          </li>
        </ul>
      </section>

      <p className="text-xs text-ink-faint">
        The snippet mechanism extends to verifying a submitter’s own privacy claims — they are already
        cooperating. It does <em>not</em> extend to the Phase 1 providers, who have no reason to
        install anything. See{' '}
        <Link to="/charter" className="text-accent underline underline-offset-2">
          the one rule
        </Link>
        .
      </p>
    </div>
  )
}
