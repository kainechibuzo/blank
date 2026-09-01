import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { requestVerification } from '../lib/listings.js'
import { TOOLS, DATASET_META, TOOL_BY_ID } from '../data/tools.js'
import { ADUO, evaluateAduo } from '../lib/aduo.js'
import { edgeFunctionUrl, probeEdgeFunction } from '../lib/edge.js'
import { scoreTool } from '../lib/scoring.js'
import { freshness } from '../lib/watchlist.js'
import Collapsible from '../components/Collapsible.jsx'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

/**
 * Three states, because the browser can only ever know three.
 *
 *  deployed   an HTTP response came back from our own code
 *  not deployed  the gateway answered 404 — no function by that name
 *  unreachable   no response at all: not deployed, wrong project ref, or CORS
 */
function backendTone(state) {
  if (!state) return { tone: 'neutral', label: 'checking' }
  if (state.deployed === true) {
    return state.reason === 'ok' || state.status === 400
      ? { tone: 'good', label: 'deployed' }
      : { tone: 'mixed', label: 'deployed, failing' }
  }
  if (state.deployed === false) return { tone: 'bad', label: 'not deployed' }
  return { tone: 'unknown', label: 'unreachable' }
}

const SNIPPET_TONE = { ok: 'good', altered: 'mixed', missing: 'mixed', unreachable: 'unknown', unchecked: 'neutral' }

const LISTING_FIELDS =
  'id, name, url, category, claimed_description, linked_tool_id, owner_id, status, snippet_state, review_required, review_reason, warning_message, editable_until, submitted_at, verified_at, last_checked_at, admin_decision, admin_decision_at, aduo_granted_at'

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
  const [applications, setApplications] = useState([])
  const [duplicates, setDuplicates] = useState([])
  const [voteSummary, setVoteSummary] = useState({})
  const [aduoForms, setAduoForms] = useState({})
  const [backend, setBackend] = useState(null)
  const [probeTick, setProbeTick] = useState(0)

  const load = async () => {
    if (!supabase) return
    const [l, c, camp, sig, log, apps, dup, vs] = await Promise.all([
      supabase.from('listings').select(LISTING_FIELDS).order('submitted_at', { ascending: false }),
      supabase.from('snippet_checks').select('*').order('checked_at', { ascending: false }).limit(200),
      supabase.from('campaigns').select('listing_id, note, week_start, created_at'),
      supabase.rpc('admin_vote_signals'),
      supabase.from('admin_actions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('aduo_applications').select('*').order('created_at', { ascending: false }),
      supabase.rpc('admin_duplicate_claims'),
      supabase.rpc('directory_vote_summary'),
    ])
    if (l.error) setError(l.error.message)
    setListings(l.data ?? [])
    setChecks(c.data ?? [])
    setCampaigns(camp.data ?? [])
    setVoteSignals(sig.error ? [] : sig.data ?? [])
    setActions(log.data ?? [])
    setApplications(apps.data ?? [])
    setDuplicates(dup.error ? [] : dup.data ?? [])
    setVoteSummary(
      Object.fromEntries((vs.data ?? []).map((r) => [r.listing_id, Number(r.upvote_score ?? 0)]))
    )
  }

  useEffect(() => {
    if (isFounder) load()
  }, [isFounder])

  // Whether the two Edge Functions are deployed is the single most confusing
  // thing a founder hits — partly because it used to be *guessed* from the
  // wording of an error message, so a function that was deployed and answering
  // got reported as missing. Show what the browser actually observed instead.
  useEffect(() => {
    if (!isFounder || !supabase) return
    let cancelled = false
    Promise.all([probeEdgeFunction('verify-snippet'), probeEdgeFunction('cast-vote')]).then(
      ([verify, cast]) => {
        if (!cancelled) setBackend({ verify, cast })
      }
    )
    return () => {
      cancelled = true
    }
  }, [isFounder, probeTick])

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

  const toolFor = (listing) => {
    const row = listing?.linked_tool_id ? TOOL_BY_ID[listing.linked_tool_id] : null
    if (!row) return null
    const s = scoreTool(row)
    return { verification: row.verification, score: s.score, coverage: s.coverage }
  }

  const decideAduo = async (app, grant) => {
    const form = aduoForms[app.id] ?? {}
    const reason = (form.reason ?? '').trim()
    if (!reason) {
      setError('Write a reason. An ADUO decision without one is not accepted.')
      return
    }
    const listing = listings.find((l) => l.id === app.listing_id)
    const tool = toolFor(listing)
    const upvotes = Number(voteSummary[app.listing_id] ?? 0)
    const evaluation = evaluateAduo({ tool, upvotes })

    if (grant && !evaluation.computablePass) {
      setError('The checkable criteria do not clear. ADUO is criteria-bound, not discretionary.')
      return
    }
    if (grant && !(form.traffic && form.reviews)) {
      setError('Both human checks must be attested: you are confirming you verified the evidence.')
      return
    }

    setBusy(app.id)
    setError(null)
    const tosCheck = evaluation.checks.find((c) => c.key === 'tos')
    const upCheck = evaluation.checks.find((c) => c.key === 'upvoteCeiling')

    const { error: appError } = await supabase
      .from('aduo_applications')
      .update({
        status: grant ? 'granted' : 'declined',
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        decision_reason: reason,
        traffic_ok: grant ? Boolean(form.traffic) : null,
        reviews_ok: grant ? Boolean(form.reviews) : null,
        tos_score: tosCheck?.status === 'unknown' ? null : tool?.score ?? null,
        tos_coverage: tosCheck?.status === 'unknown' ? null : tool?.coverage ?? null,
        tos_ok: tosCheck ? tosCheck.status === 'pass' : null,
        upvotes_at_decision: upvotes,
        upvote_ok: upCheck ? upCheck.status === 'pass' : null,
        thresholds_ratified_at_decision: ADUO.ratified,
      })
      .eq('id', app.id)

    if (appError) {
      setError(appError.message)
      setBusy(null)
      return
    }

    if (grant) {
      await supabase
        .from('listings')
        .update({ aduo_granted_at: new Date().toISOString() })
        .eq('id', app.listing_id)
    }

    await record(
      listing ?? { id: app.listing_id, name: app.listing_name ?? 'unknown listing' },
      grant ? 'aduo_granted' : 'aduo_declined',
      reason
    )
    setAduoForms((f) => ({ ...f, [app.id]: {} }))
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

      {backend && (
        <div className="rounded-lg border border-line bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Backend functions
            </p>
            <button
              type="button"
              onClick={() => setProbeTick((t) => t + 1)}
              className="text-[11px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
            >
              Re-check
            </button>
          </div>

          {/* The host this build actually calls. A project reference with one
              character wrong resolves to nothing, and the browser reports that
              identically to a missing function — so show it rather than let it
              be inferred from an error. */}
          <p className="mt-1 break-all font-mono text-[11px] text-ink-faint">
            {edgeFunctionUrl('verify-snippet')?.replace(/verify-snippet$/, '') ??
              'VITE_SUPABASE_URL is not set'}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ['verify-snippet', backend.verify],
              ['cast-vote', backend.cast],
            ].map(([name, state]) => (
              <div key={name} className="rounded border border-line/70 p-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <code className="font-mono text-xs text-ink">{name}</code>
                  <Pill tone={backendTone(state).tone}>{backendTone(state).label}</Pill>
                  {state?.status != null && (
                    <span className="font-mono text-[10px] text-ink-faint">HTTP {state.status}</span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">{state?.message}</p>
                {state?.hint && (
                  <code className="mt-1 block break-all font-mono text-[10px] text-ink-faint">
                    {state.hint}
                  </code>
                )}
              </div>
            ))}
          </div>

          {!(backend.verify?.deployed && backend.cast?.deployed) && (
            <pre className="mt-3 overflow-x-auto rounded bg-paper p-3 font-mono text-[11px] leading-relaxed text-ink-soft">
{`supabase functions list   # confirm what is deployed, and in which project
supabase functions deploy verify-snippet
supabase functions deploy cast-vote
supabase secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=...`}
            </pre>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
            &ldquo;Unreachable&rdquo; does not only mean not deployed: a wrong project reference
            and a reply blocked for missing CORS headers look the same from a browser. Both
            functions now send CORS headers and answer preflight, so if one still reads
            unreachable, check the host above against your project before redeploying.
          </p>
        </div>
      )}

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

      <Collapsible title="ADUO applications" count={applications.filter((a) => a.status === 'pending').length}>
        <Callout variant="warn" title="Thresholds are UNRATIFIED — every grant is provisional">
          These criteria have not been agreed yet, and they must be ratified <strong>before</strong> the
          first grant is normalised, not after. Until then each grant is a founder decision made
          against numbers that are still open to argument, and it is recorded as such.
        </Callout>

        {applications.filter((a) => a.status === 'pending').length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No open applications.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {applications
              .filter((a) => a.status === 'pending')
              .map((app) => {
                const listing = listings.find((l) => l.id === app.listing_id)
                const ev = evaluateAduo({
                  tool: toolFor(listing),
                  upvotes: voteSummary[app.listing_id] ?? 0,
                })
                const form = aduoForms[app.id] ?? {}
                const canGrant = ev.computablePass && form.traffic && form.reviews
                return (
                  <li key={app.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {listing?.name ?? app.listing_id.slice(0, 8)}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {ev.checks.map((c) => (
                          <Pill
                            key={c.key}
                            tone={c.status === 'pass' ? 'good' : c.status === 'fail' ? 'bad' : 'unknown'}
                          >
                            {c.label}: {c.status}
                          </Pill>
                        ))}
                      </span>
                    </div>

                    <ul className="mt-2 space-y-1">
                      {ev.checks.map((c) => (
                        <li key={c.key} className="text-xs text-ink-soft">
                          <strong className="text-ink">{c.label}:</strong> {c.detail}
                        </li>
                      ))}
                    </ul>

                    {(app.traffic_evidence || app.reviews_evidence || app.applicant_note) && (
                      <div className="mt-2 rounded border border-line bg-paper p-2">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
                          Evidence supplied
                        </p>
                        {app.traffic_evidence && (
                          <p className="mt-1 break-all text-xs text-ink-soft">Traffic: {app.traffic_evidence}</p>
                        )}
                        {app.reviews_evidence && (
                          <p className="mt-1 break-all text-xs text-ink-soft">Reviews: {app.reviews_evidence}</p>
                        )}
                        {app.applicant_note && (
                          <p className="mt-1 text-xs text-ink-soft">Note: {app.applicant_note}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3">
                      <label className="flex min-h-[44px] items-center gap-2 text-xs text-ink-soft sm:min-h-0">
                        <input
                          type="checkbox"
                          checked={Boolean(form.traffic)}
                          onChange={(e) =>
                            setAduoForms((f) => ({ ...f, [app.id]: { ...f[app.id], traffic: e.target.checked } }))
                          }
                          className="h-3.5 w-3.5 accent-accent"
                        />
                        I verified the traffic evidence
                      </label>
                      <label className="flex min-h-[44px] items-center gap-2 text-xs text-ink-soft sm:min-h-0">
                        <input
                          type="checkbox"
                          checked={Boolean(form.reviews)}
                          onChange={(e) =>
                            setAduoForms((f) => ({ ...f, [app.id]: { ...f[app.id], reviews: e.target.checked } }))
                          }
                          className="h-3.5 w-3.5 accent-accent"
                        />
                        I verified the review evidence
                      </label>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={form.reason ?? ''}
                        onChange={(e) =>
                          setAduoForms((f) => ({ ...f, [app.id]: { ...f[app.id], reason: e.target.value } }))
                        }
                        placeholder="Reason for this decision (recorded)"
                        className="min-h-[44px] w-full flex-1 rounded-md border border-line px-2 py-2 text-xs text-ink sm:min-h-[36px] sm:py-1.5"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!canGrant || busy === app.id}
                          title={canGrant ? undefined : 'Needs a reason, both human checks, and the checkable criteria to clear.'}
                          onClick={() => decideAduo(app, true)}
                          className="inline-flex min-h-[44px] items-center rounded-md border border-good bg-good-soft px-3 py-1.5 text-xs font-medium text-good disabled:opacity-40 sm:min-h-[36px]"
                        >
                          Grant boost
                        </button>
                        <button
                          type="button"
                          disabled={busy === app.id}
                          onClick={() => decideAduo(app, false)}
                          className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50 sm:min-h-[36px]"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
          </ul>
        )}

        {applications.filter((a) => a.status !== 'pending').length > 0 && (
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              Decided
            </p>
            <ul className="mt-1 space-y-1">
              {applications
                .filter((a) => a.status !== 'pending')
                .slice(0, 10)
                .map((a) => (
                  <li key={a.id} className="text-xs text-ink-soft">
                    {listings.find((l) => l.id === a.listing_id)?.name ?? a.listing_id.slice(0, 8)} —{' '}
                    <strong className="text-ink">{a.status}</strong>
                    {a.thresholds_ratified_at_decision ? '' : ' (thresholds were unratified)'}
                    {a.decision_reason ? `: ${a.decision_reason}` : ''}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </Collapsible>

      <Collapsible title="Duplicate claims" count={duplicates.length}>
        <p className="text-xs text-ink-soft">
          The same site claimed by more than one account. The database cannot decide who is right —
          only one of them can actually place the verification tag — so this is listed for a person.
        </p>
        {duplicates.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No duplicate claims.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {duplicates.map((d) => (
              <li key={d.site_key} className="rounded border border-mixed/40 bg-mixed-soft/50 p-2">
                <p className="font-mono text-xs text-ink">{d.site_key}</p>
                <p className="text-xs text-ink-soft">
                  {d.claim_count} claims: {d.listing_names.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
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
