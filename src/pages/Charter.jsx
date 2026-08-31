import { Link } from 'react-router-dom'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

const NEVER = [
  {
    title: 'Which tools get evaluated',
    body: 'Coverage is chosen on user relevance, not on who asked, paid, or threatened. Nobody buys their way into the database, and nobody buys their way out of it.',
  },
  {
    title: 'How a clause gets summarised',
    body: 'Summaries are written from the policy and nothing else. A sponsor does not review, suggest, or pre-approve wording — not even informally, not even once.',
  },
  {
    title: 'Ranking position',
    body: 'Ordering comes from the public score and the filters the user chose. There is no promoted slot, no sponsored placement, no “also consider” paid row.',
  },
  {
    title: 'Upvote counts or review turnaround',
    body: 'Phase 2 adds votes and a review queue. Neither may be bought, boosted, or expedited for money. A company that pays waits exactly as long as one that doesn’t.',
  },
  {
    title: 'Badges, boosts, or “verified partner” marks',
    body: 'No mark of any kind exists inside the honest comparison that can be acquired. “Verified” means a human read the policy — that is all it will ever mean.',
  },
]

const ALLOWED = [
  'A separate, clearly labelled sponsor page that does not feed into, link into, or rank inside the comparison.',
  'A mention in a changelog or “who funds this” note, so funding is disclosed rather than hidden.',
  'Ordinary commercial relationships that have nothing to do with the data: hosting, design, tooling.',
]

const ENFORCEMENT = [
  'The provider dataset has no sponsorship field, and a traceability check fails the build if one is ever added.',
  'Sponsors live on their own route with their own data file. No component in /compare, /tools or /discover imports it.',
  'Chat recommendations are produced by the same ranking function as the comparison page, so there is no second, influenceable ranking to sell.',
  'The three signals — transparency score, data coverage, community signal — are rendered separately by design, never summed.',
]

export default function Charter() {
  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <Pill tone="accent" className="mb-3">
          Written before there is revenue to bend it
        </Pill>
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">The one rule</h1>
        <p className="mt-2 text-ink-soft">
          Everything else in this product is downstream of this. It is written down now, while it is
          cheap to hold, because the pressure to blur it arrives later with money attached.
        </p>
      </header>

      <section className="rounded-lg border-l-4 border-accent bg-accent-soft p-6">
        <p className="font-serif text-xl leading-relaxed text-accent-ink">
          Money — sponsorship, partner deals, “we want this company on the site” — can fund a clearly
          separate page. It can never touch which tools get evaluated, how a clause gets summarised,
          or any ranking, badge or boost inside the real comparison.
        </p>
        <p className="mt-3 text-sm text-accent-ink/80">
          The moment this blurs even subtly, the entire value of the product — trust — is gone.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">What money can never touch</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {NEVER.map((n) => (
            <div key={n.title} className="rounded-lg border border-line bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">{n.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{n.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">What money can do</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {ALLOWED.map((a) => (
            <li key={a} className="flex gap-2">
              <span className="text-good">✓</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">How it is held structurally, not by vibe</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Intentions erode. Structure doesn’t. Each of these is a property of the codebase that can
          be pointed at, tested, and broken only on purpose.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {ENFORCEMENT.map((e) => (
            <li key={e} className="flex gap-2">
              <span className="font-mono text-xs text-accent">▸</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-faint">
          Verified on every build by <code className="font-mono">npm run check:traceability</code>.
        </p>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">Corollaries already committed to</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Callout variant="rule" title="No combined score">
            Transparency rating and community upvotes are separate signals with separate labels. They
            are never added together into one number, because a tool can be honest and mediocre, or
            excellent and careless.
          </Callout>
          <Callout variant="rule" title="Chat is a view, not an oracle">
            Discovery output is a filtered view of the same scored data. A recommendation that cannot
            be traced back to the public comparison page is a bug, not a feature.
          </Callout>
          <Callout variant="rule" title="ADUO is disclosed, always">
            The Phase 2 balance-of-performance boost is a deliberate, published exception to
            vote-only ranking. It is labelled on the listing itself — never invisible — and granted
            against fixed criteria, never because a company was liked.
          </Callout>
          <Callout variant="rule" title="Verification means one thing">
            “Verified” confirms that a human read the linked policy on the recorded date. It is not a
            quality mark, not a safety endorsement, and not purchasable.
          </Callout>
        </div>
      </section>

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">If the line is crossed</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Public correction on the affected page, naming what happened and what changed, with the
          amendment recorded below. Quiet fixes are the mechanism by which trust dies slowly instead
          of all at once.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-sm font-semibold text-ink">Amendments</h2>
        <table className="mt-3 w-full text-left text-sm">
          <tbody className="divide-y divide-line">
            <tr>
              <td className="py-2 font-mono text-xs text-ink-faint">v1.0 · 2026-08-31</td>
              <td className="py-2 text-ink-soft">
                Charter adopted before any revenue exists. Sponsorship separation, signal separation,
                chat traceability, and non-purchasable review turnaround.
              </td>
            </tr>
            <tr>
              <td className="py-2 font-mono text-xs text-ink-faint">pending</td>
              <td className="py-2 text-ink-faint">
                ADUO thresholds — to be ratified before the first grant is made, not after.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="text-xs text-ink-faint">
        See also:{' '}
        <Link to="/sponsors" className="text-accent underline underline-offset-2">
          the separate sponsor page
        </Link>{' '}
        ·{' '}
        <Link to="/methodology" className="text-accent underline underline-offset-2">
          methodology
        </Link>
      </p>
    </div>
  )
}
