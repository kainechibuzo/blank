import { Link } from 'react-router-dom'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

/**
 * This page is the only place sponsorship may ever appear. It is isolated on
 * purpose: it has its own route, its own data, and it is imported by no other
 * page. If a sponsor ever shows up inside /compare, /tools or /discover, that
 * is a bug — report it.
 */
export default function Sponsors() {
  return (
    <div className="space-y-8">
      <div className="rounded-lg border-2 border-dashed border-mixed/50 bg-mixed-soft p-4">
        <p className="text-sm font-semibold text-mixed">Separate surface</p>
        <p className="mt-1 text-sm text-mixed/90">
          You are on the only page where money can appear. Nothing on this page feeds into, ranks
          within, badges within, or links into the comparison, the tool pages, or the discovery
          results.
        </p>
      </div>

      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold text-ink">Sponsors &amp; funding</h1>
        <p className="mt-2 text-ink-soft">
          The comparison is the product. Funding pays for the work around it, and the separation is
          structural rather than promised.
        </p>
      </header>

      <section className="rounded-lg border border-line bg-white p-6 text-center">
        <Pill tone="unknown">No sponsors yet</Pill>
        <p className="mx-auto mt-3 max-w-xl text-sm text-ink-soft">
          When there are sponsors, they appear here — a name, a link, and a plain statement of what
          they paid for. They do not appear anywhere else on this site, and they never receive a
          badge, a boost, a faster review, or a position in any ranking.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">What sponsorship buys</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>A listing on this page.</li>
            <li>Funding for verification labour — the actual cost of this business.</li>
            <li>Nothing else.</li>
          </ul>
        </div>
        <div className="rounded-lg border border-bad/30 bg-bad-soft p-4">
          <h2 className="text-sm font-semibold text-bad">What sponsorship never buys</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>Inclusion in, or exclusion from, the provider database.</li>
            <li>Any change to how a clause is summarised.</li>
            <li>Position in any ranking, list, or chat result.</li>
            <li>Faster verification or review turnaround.</li>
            <li>Any badge, mark, or “verified partner” status inside honest results.</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">Other revenue, all of it boring</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ['Donations', 'From people who want the transparency work to exist. No donor gets input on the data.'],
            ['Policy change alerts', 'A paid tier: tell me when a tool I use changes its policy. Sells convenience, never influence.'],
            ['Dataset licensing', 'Later, and only under terms that keep the public comparison free and complete. A licensee never gets editorial rights.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-line bg-white p-4">
              <h3 className="text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Callout variant="warn" title="If you ever see a sponsor mark inside the comparison">
        That is a breach of the one rule, not a design choice. Say so — publicly if you prefer. The
        correction goes on the affected page rather than in a quiet patch.{' '}
        <Link to="/charter" className="underline underline-offset-2">
          Read the rule in full
        </Link>
        .
      </Callout>
    </div>
  )
}
