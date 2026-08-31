import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { requestVerification } from '../lib/listings.js'
import { TOOLS, DATASET_META } from '../data/tools.js'
import { scoreTool } from '../lib/scoring.js'
import { freshness } from '../lib/watchlist.js'
import Collapsible from '../components/Collapsible.jsx'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

const SNIPPET_TONE = { ok: 'good', altered: 'mixed', missing: 'mixed', unreachable: 'unknown', unchecked: 'neutral' }

const LISTING_FIELDS =
  'id, name, url, category, claimed_description, owner_id, status, snippet_state, review_required, review_reason, warning_message, editable_until, submitted_at, verified_at, last_checked_at, admin_decision, admin_decision_at'

/**
 * Founder-only.
 *
 * This is where the weekly snippet check's "a human will look at this" actually
 * happens: the bot flags, and a person decides.
 *
 * Three deliberate limits, all of them features:
 *  - nothing here edits a transparency score or a ranking. Those come from a
 *    human reading a linked policy on a recorded date, and that workflow lives
 *    in code and review, not in a toggle.
 *  - every decision needs a written reason, and every one is appended to an
 *    audit log that cannot be edited or deleted.
 *  - vote oversight reports shape — counts and timing — never who voted.
 */
export default function Admin() {
  const { user, profile, isFounder, loading } = useAuth()

  const [listings, setListings] = useState([])
  const [checks, setChecks] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [voteSignals, setVoteSignals] = useState([])
  const [actions, setActions] = useState([])
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [reasons, setReasons] = useState({})

  const load = async () => {
    if (!supabase) return
    const [l, c, camp, sig, log] = await Promise.all([
      supabase.from('listings').select(LISTING_FIELDS).order('submitted_at', { ascending: false }),
      supabase.from('snippet_checks').select('*').order('checked_at', { ascending: false }).limit(200),
      supabase.from('campaigns').select('listing_id, note, week_start, created_at'),
      supabase.rpc('admin_vote_signals'),
      supabase.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(50),
    ])
    if (l.error) setError(l.error.message)
    setListings(l.data ?? [])
    setChecks(c.data ?? [])
    setCampaigns(camp.data ?? [])
    setVoteSignals(sig.error ? [] : sig.data ?? [])
    setActions(log.data ?? [])
  }

  useEffect(() => {
    if (isFounder) load()
  }, [isFounder])

  const checksByListing = useMemo(() => {
    const map = {}
    for (const c of checks) (map[c.listing_id] ??= []).push(c)
    return map
  }, [checks])

  const signalsByListing = useMemo(
    () => Object.fromEntries(voteSignals.map((s) => [s.listing_id, s])),
    [voteSignals]
  )

  const dataset = useMemo(() => {
    const rows = TOOLS.map((t) => ({ t, s: scoreTool(t), age: freshness(t) }))
    return {
      verified: rows.filter((r) => r.t.verification.status === 'verified').length,
      draft: rows.filter((r) => r.t.verification.status !== 'verified').length,
      unknownFields: rows.reduce(
        (n, r) => n + Object.values(r.t.fields).filter((f) => f?.value === 'unknown').length,
        0
      ),
      stale: rows.filter((r) => r.age.state === 'stale').length,
      rows,
    }
  }, [])

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  if (!user || !isFounder) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Admin</h1>
        <Callout variant="warn" title="Founder access required">
          This page is for the person accountable for the site’s decisions. It is gated in the
          interface and in the database — the vote-signals function refuses to run for anyone whose
          profile role is not <code className="font-mono text-xs">founder</code>.
          <br />
          <br />
          To make yourself a founder, run this once in the Supabase SQL editor:
          <pre className="mt-2 overflow-x-auto rounded bg-paper p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
{`update public.profiles
   set role = 'founder'
 where email = '${user?.email ?? 'you@example.org'}';`}
          </pre>
          {!user && (
            <>
              You are not signed in.{' '}
              <Link to="/account" className="text-accent underline underline-offset-2">
                Sign in first
              </Link>
              .
            </>
          )}
        </Callout>
      </div>
    )
  }

  const record = async (listing, action, reason) => {
    await supabase.from('admin_actions').insert({
      actor_id: user.id,
      actor_email: user.email,
      listing_id: listing.id,
      listing_name: listing.name,
      action,
      reason,
    })
  }

  const decide = async (listing, action) => {
    const reason = (reasons[listing.id] ?? '').trim()
    if (!reason) {
      setError('Write a reason first. Administrative actions without one are not accepted.')
      return
    }
    setBusy(listing.id)
    setError(null)

    const patch = {
      admin_decision: reason,
      admin_decision_at: new Date().toISOString(),
    }
    if (action === 'delisted') {
      patch.status = 'delisted'
      patch.review_required = false
    } else if (action === 'kept_listed') {
      // An innocent change: a redesign, a CMS migration, a caching layer that
      // strips head tags. Clear the flag and say so.
      patch.review_required = false
      patch.review_reason = null
      patch.warning_message = null
    } else if (action === 'relisted') {
      patch.status = 'listed'
      patch.review_required = false
    }

    const { error: updateError } = await supabase.from('listings').update(patch).eq('id', listing.id)
    if (updateError) {
      setError(updateError.message)
      setBusy(null)
      return
    }
    await record(listing, action === 'delisted' ? 'delisted' : action === 'relisted' ? 'relisted' : 'kept_listed', reason)
    setReasons((r) => ({ ...r, [listing.id]: '' }))
    setBusy(null)
    await load()
  }

  const recheck = async (listing) => {
    setBusy(listing.id)
    setError(null)
    const { error: checkError } = await requestVerification(listing.id)
    if (checkError) setError(checkError)
    else await record(listing, 'rechecked', 'Manual re-check from the admin dashboard.')
    setBusy(null)
    await load()
  }

  const reviewQueue = listings.filter((l) => l.review_required)
  const pending = listings.filter((l) => l.status === 'pending')
  const listed = listings.filter((l) => l.status === 'listed')
  const delisted = listings.filter((l) => l.status === 'delisted')

  const Row = ({ listing, showHistory = false }) => (
    <li key={listing.id} className="rounded-lg border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{listing.name}</span>
        <span className="flex flex-wrap gap-1">
          <Pill tone={listing.status === 'listed' ? 'good' : listing.status === 'delisted' ? 'bad' : 'unknown'}>
            {listing.status}
          </Pill>
          <Pill tone={SNIPPET_TONE[listing.snippet_state] ?? 'neutral'}>snippet: {listing.snippet_state}</Pill>
          {signalsByListing[listing.id] && (
            <Pill tone="neutral">{signalsByListing[listing.id].total} votes</Pill>
          )}
        </span>
      </div>
      <p className="mt-1 break-all text-xs text-ink-faint">{listing.url}</p>
      {listing.claimed_description && (
        <p className="mt-1 text-xs text-ink-faint">Claimed: “{listing.claimed_description}”</p>
      )}
      {listing.admin_decision && (
        <p className="mt-2 rounded border-l-2 border-ink/30 bg-paper px-3 py-2 text-xs text-ink-soft">
          Decision: {listing.admin_decision}
        </p>
      )}

      {showHistory && (checksByListing[listing.id]?.length ?? 0) > 0 && (
        <div className="mt-3 rounded border border-line bg-paper p-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Check log</p>
          <ul className="mt-1 space-y-0.5">
            {checksByListing[listing.id].slice(0, 6).map((c) => (
              <li key={c.id} className="font-mono text-[11px] text-ink-soft">
                {new Date(c.checked_at).toISOString().slice(0, 16).replace('T', ' ')} · {c.outcome}
                {c.http_status ? ` · HTTP ${c.http_status}` : ''} · {c.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={reasons[listing.id] ?? ''}
          onChange={(e) => setReasons((r) => ({ ...r, [listing.id]: e.target.value }))}
          placeholder="Reason for this decision (recorded)"
          className="min-h-[44px] w-full flex-1 rounded-md border border-line px-2 py-2 text-xs text-ink sm:min-h-[36px] sm:py-1.5"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy === listing.id}
            onClick={() => recheck(listing)}
            className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50 sm:min-h-[36px]"
          >
            Re-check
          </button>
          {listing.status === 'listed' ? (
            <>
              <button
                type="button"
                disabled={busy === listing.id}
                onClick={() => decide(listing, 'kept_listed')}
                className="inline-flex min-h-[44px] items-center rounded-md border border-good bg-good-soft px-3 py-1.5 text-xs font-medium text-good disabled:opacity-50 sm:min-h-[36px]"
              >
                Keep listed
              </button>
              <button
                type="button"
                disabled={busy === listing.id}
                onClick={() => decide(listing, 'delisted')}
                className="inline-flex min-h-[44px] items-center rounded-md border border-bad bg-bad-soft px-3 py-1.5 text-xs font-medium text-bad disabled:opacity-50 sm:min-h-[36px]"
              >
                Delist
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy === listing.id}
              onClick={() => decide(listing, 'relisted')}
              className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50 sm:min-h-[36px]"
            >
              Relist
            </button>
          )}
        </div>
      </div>
    </li>
  )

  return (
    <div className="space-y-7 sm:space-y-10">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="accent">Founder</Pill>
          <Pill tone="neutral">{profile?.email ?? user.email}</Pill>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-ink sm:text-3xl">Admin</h1>
        <p className="mt-2 text-ink-soft">
          The weekly check flags. You decide. Every decision here is written to an audit log with your
          name, the reason you gave, and the time you took it.
        </p>
      </header>

      <Callout variant="rule" title="What this dashboard cannot do">
        It cannot change a transparency score, a ranking, or a provider row. Those come from a human
        reading a linked policy on a recorded date, and that happens in the verification workflow —
        in code, with a reviewer and a date attached — not from a toggle here.
      </Callout>

      {error && <Callout variant="danger">{error}</Callout>}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Needs review', reviewQueue.length],
          ['Awaiting verification', pending.length],
          ['Listed', listed.length],
          ['Delisted', delisted.length],
        ].map(([label, n]) => (
          <div key={label} className="rounded-lg border border-line bg-white p-4">
            <p className="text-2xl font-semibold tabular-nums text-ink">{n}</p>
            <p className="text-xs text-ink-faint">{label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-ink sm:text-xl">Review queue</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Listings the weekly check flagged because a previously confirmed tag stopped confirming.
          Most of these are innocent. Read the log before deciding.
        </p>
        {reviewQueue.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nothing needs a decision. The queue is empty.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {reviewQueue.map((l) => (
              <Row key={l.id} listing={l} showHistory />
            ))}
          </ul>
        )}
      </section>

      <Collapsible title="Awaiting verification" count={pending.length}>
        {pending.length === 0 ? (
          <p className="text-sm text-ink-soft">Nothing waiting.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((l) => (
              <Row key={l.id} listing={l} />
            ))}
          </ul>
        )}
      </Collapsible>

      <Collapsible title="Listed and delisted" count={listed.length + delisted.length}>
        <ul className="space-y-3">
          {[...listed, ...delisted].map((l) => (
            <Row key={l.id} listing={l} />
          ))}
        </ul>
      </Collapsible>

      <Collapsible title="Vote oversight" count={voteSignals.length}>
        <p className="text-xs text-ink-soft">
          Shape, not identities: how many votes, how many in the last day, how many from accounts
          under the 14-day minimum (should always be zero — the database refuses them), and how many
          separate days the votes arrived on. A listing that got everything in one afternoon is not
          the same signal as one that gathered votes over a month.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Listing</th>
                <th className="px-4 py-2 font-medium">Votes</th>
                <th className="px-4 py-2 font-medium">Last 24h</th>
                <th className="px-4 py-2 font-medium">New accounts</th>
                <th className="px-4 py-2 font-medium">Days spanned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {voteSignals.map((s) => {
                const l = listings.find((x) => x.id === s.listing_id)
                return (
                  <tr key={s.listing_id}>
                    <td className="px-4 py-2.5 font-medium text-ink">{l?.name ?? s.listing_id.slice(0, 8)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{s.total}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{s.last_24h}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      <span className={Number(s.from_new_accounts) > 0 ? 'text-bad' : 'text-ink-soft'}>
                        {s.from_new_accounts}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-soft">{s.distinct_days}</td>
                  </tr>
                )
              })}
              {voteSignals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-sm text-ink-faint">
                    No votes recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {campaigns.length > 0 && (
          <div className="mt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Promotion campaigns
            </p>
            <ul className="mt-1 space-y-1">
              {campaigns.map((c) => (
                <li key={c.listing_id + c.week_start} className="text-xs text-ink-soft">
                  {listings.find((l) => l.id === c.listing_id)?.name ?? c.listing_id.slice(0, 8)} — week
                  of {c.week_start}
                  {c.note ? `: “${c.note}”` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Collapsible>

      <Collapsible title="Dataset overview (read only)" count={TOOLS.length}>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Tools tracked', TOOLS.length],
            ['Verified by a human', dataset.verified],
            ['Draft — unverified', dataset.draft],
            ['Unknown answers', dataset.unknownFields],
          ].map(([label, n]) => (
            <div key={label} className="rounded border border-line bg-white p-3">
              <p className="text-xl font-semibold tabular-nums text-ink">{n}</p>
              <p className="text-[11px] text-ink-faint">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          {DATASET_META.scope}. Rows are read straight from the provider dataset — correcting one is a
          code change with a reviewer and a date, never a dashboard edit.{' '}
          <Link to="/methodology" className="text-accent underline underline-offset-2">
            How verification works
          </Link>
          .
        </p>
      </Collapsible>

      <Collapsible title="Audit log" count={actions.length}>
        <ul className="space-y-2">
          {actions.map((a) => (
            <li key={a.id} className="rounded border border-line bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink">
                  {a.action.replace(/_/g, ' ')} · {a.listing_name ?? '(listing removed)'}
                </span>
                <span className="font-mono text-[11px] text-ink-faint">
                  {new Date(a.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-soft">{a.reason}</p>
              <p className="mt-1 font-mono text-[11px] text-ink-faint">{a.actor_email}</p>
            </li>
          ))}
          {actions.length === 0 && <li className="text-sm text-ink-faint">No decisions recorded yet.</li>}
        </ul>
      </Collapsible>
    </div>
  )
}
