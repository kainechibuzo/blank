import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { buildWarning } from '../lib/snippet-warning.js'
import { CATEGORIES } from '../data/schema.js'
import { TOOL_BY_ID } from '../data/tools.js'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'
import Monogram from '../components/Monogram.jsx'

const THRESHOLDS = [
  ['Traffic trend', '≥ 15% month-on-month growth over 3 months, from a base of ≥ 1,000 monthly visits', 'Reliable only once a footprint exists — see the known gap below.'],
  ['External reviews', '≥ 10 off-site reviews with median sentiment ≥ 4/5, at least 3 substantive', 'Substance over volume; app stores and forums, not the tool’s own site.'],
  ['ToS / privacy score', '≥ 60 / 100 with coverage ≥ 70%', 'Drawn from Phase 1 data. An unverified row cannot qualify.'],
  ['Upvote ceiling', 'Fewer than 50 upvotes', 'Above this the listing is presumed able to compete on votes alone.'],
]

const SNIPPET_TONE = { ok: 'good', altered: 'mixed', missing: 'mixed', unreachable: 'unknown', unchecked: 'neutral' }

// Shown so the actual text an owner receives is public, not paraphrased.
const SAMPLE_WARNING = buildWarning({
  listingName: 'Example Tool',
  supportEmail: 'support@example.org',
  checks: [
    { checked_at: new Date().toISOString(), outcome: 'missing', note: 'No verification tag found in the page.', httpStatus: 200 },
    { checked_at: new Date(Date.now() - 7 * 86400000).toISOString(), outcome: 'ok', note: 'Verification tag present and matching.', httpStatus: 200 },
  ],
})

function ListingCard({ listing }) {
  const linked = listing.linked_tool_id ? TOOL_BY_ID[listing.linked_tool_id] : null
  return (
    <article className="flex h-full flex-col rounded-lg border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <Monogram tool={{ monogram: listing.name.slice(0, 2).toUpperCase(), accent: '#0b6b63' }} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink">
            <a href={listing.url} target="_blank" rel="noreferrer noopener" className="hover:underline">
              {listing.name}
            </a>
          </h3>
          <p className="truncate text-xs text-ink-faint">
            {CATEGORIES[listing.category] ?? listing.category} · {new URL(listing.url).hostname}
          </p>
        </div>
        <Pill tone={SNIPPET_TONE[listing.snippet_state] ?? 'neutral'}>snippet: {listing.snippet_state}</Pill>
      </div>

      {listing.blurb && <p className="mt-3 text-sm text-ink-soft">{listing.blurb}</p>}
      {listing.claimed_description && (
        <p className="mt-2 text-xs text-ink-faint">Claimed at submission: “{listing.claimed_description}”</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <Pill tone="unknown" title="Voting is Stage 2. Nothing here is ranked by votes yet.">
          no votes yet
        </Pill>
        {listing.verified_at && (
          <span className="text-[11px] text-ink-faint">
            ownership confirmed {new Date(listing.verified_at).toISOString().slice(0, 10)}
          </span>
        )}
        {linked && (
          <Link to={`/tools/${linked.id}`} className="ml-auto text-xs text-accent underline underline-offset-2">
            transparency row →
          </Link>
        )}
      </div>
    </article>
  )
}

export default function Directory() {
  const { user, configured } = useAuth()
  const [listings, setListings] = useState([])
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('listings')
      .select('id, name, url, category, blurb, claimed_description, snippet_state, verified_at, linked_tool_id')
      .eq('status', 'listed')
      .order('verified_at', { ascending: false })
      .then(({ data, error: qError }) => {
        setLoading(false)
        if (qError) setError(qError.message)
        else setListings(data ?? [])
      })
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      setMine([])
      return
    }
    supabase
      .from('listings')
      .select('id, name, url, status, snippet_state, review_required, warning_message')
      .eq('owner_id', user.id)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => setMine(data ?? []))
  }, [user])

  return (
    <div className="space-y-10">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="accent">Phase 2 — live</Pill>
          <Pill tone="neutral">Ownership verified · no voting yet</Pill>
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-ink">Directory</h1>
        <p className="mt-2 text-ink-soft">
          Community-submitted tools, each proven to be controlled by the person who submitted it. This is a separate
          axis from the transparency database: Phase 1 answers “is it honest with my data”, this answers “real users
          vouch for it”. They are never blended into one score.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/directory/submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
            Submit a tool
          </Link>
          <Link to="/account" className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink">
            {user ? 'Your account' : 'Sign in'}
          </Link>
        </div>
      </header>

      {!configured && (
        <Callout variant="warn" title="The directory needs a Supabase project">
          Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>, run{' '}
          <code className="font-mono text-xs">supabase/migrations/0001_phase2_directory.sql</code>, and deploy the{' '}
          <code className="font-mono text-xs">verify-snippet</code> function. Until then this page shows no listings —
          which is the honest state, not an error.
        </Callout>
      )}

      {error && <Callout variant="danger">Could not load listings: {error}</Callout>}

      {configured && (
        <section>
          <h2 className="text-xl font-semibold text-ink">Listed tools</h2>
          {loading ? (
            <p className="mt-2 text-sm text-ink-soft">Loading…</p>
          ) : listings.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Nothing listed yet. A listing appears here only once its ownership tag has been confirmed.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      )}

      {mine.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-ink">Your submissions</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((l) => (
              <li key={l.id} className="rounded-lg border border-line bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{l.name}</span>
                  <span className="flex flex-wrap gap-1">
                    <Pill tone={l.status === 'listed' ? 'good' : 'unknown'}>{l.status}</Pill>
                    <Pill tone={SNIPPET_TONE[l.snippet_state] ?? 'neutral'}>snippet: {l.snippet_state}</Pill>
                    {l.review_required && <Pill tone="bad">human review pending</Pill>}
                  </span>
                </div>
                {l.review_required && (
                  <div className="mt-2 rounded border-l-2 border-mixed/50 bg-mixed-soft/60 px-3 py-2">
                    <p className="text-xs font-medium text-mixed">
                      Nothing has been removed. A person reviews this before anything changes.
                    </p>
                    {l.warning_message && (
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-soft">
                        {l.warning_message}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold text-ink">How verification works</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ['1. Submit', 'You add the product and say what it is. A unique verification tag is issued to you.'],
            ['2. Prove control', 'You add one static meta tag to your homepage. The bot fetches the public page and confirms it. No credentials, no keys, no backend access.'],
            ['3. Re-checked weekly', 'Every week the tag is re-checked. If it disappears or changes, the listing is flagged for a human — never removed by the bot.'],
          ].map(([title, body]) => (
            <li key={title} className="rounded-lg border border-line bg-white p-4">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-ink">The warning an owner receives</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Published in full, because a warning people cannot see is a warning that can quietly get worse later. This is
          the exact text the weekly check writes to a listing when a previously confirmed tag stops confirming.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-white p-4 font-mono text-[11px] leading-relaxed text-ink-soft">
          {SAMPLE_WARNING.text}
        </pre>
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-ink">ADUO — balance-of-performance boost</h2>
          <Pill tone="unknown">Stage 3 — not built</Pill>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Named after F1-style performance balancing: a listing with few upvotes but strong underlying signals gets
          extra visibility, so good undiscovered tools are not buried under incumbents who won early and snowballed on
          raw vote count.
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

        <Callout variant="warn" className="mt-3" title="UNRATIFIED — do not treat these as final">
          These thresholds are proposed, not decided. They must be ratified <strong>before</strong> the first grant, not
          after: deciding the bar once you can see who clears it turns a rule into a favour. When Stage 3 is built, the
          mechanism will run against these numbers but no listing will receive a boost automatically — every grant is a
          manual founder decision, recorded on the listing.
        </Callout>

        <Callout variant="note" className="mt-3" title="Known gap">
          Traffic data is least reliable for exactly the earliest-stage tools ADUO is meant to help. For very early
          submissions, evaluate on reviews and ToS score alone, and add traffic once it exists.
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
          <h2 className="text-sm font-semibold text-ink">Anti-gaming (Stage 2)</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>Account age minimum plus captcha on voting.</li>
            <li>Upvotes decay daily, so a one-off pile-on cannot have a permanent effect.</li>
            <li>One promotion campaign per submitter per week.</li>
          </ul>
        </div>
      </section>

      <Callout variant="rule" title="What listing does not mean">
        A confirmed tag proves control of a domain and that the site matches what was claimed. It is not a quality
        mark, not a safety endorsement, and it changes nothing in the Phase 1 transparency database. See{' '}
        <Link to="/charter" className="underline underline-offset-2">
          the one rule
        </Link>
        .
      </Callout>
    </div>
  )
}
