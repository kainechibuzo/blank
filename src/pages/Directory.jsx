import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase, SUPPORT_EMAIL } from '../lib/supabase.js'
import { buildWarning } from '../lib/snippet-warning.js'
import {
  VOTE_MIN_ACCOUNT_AGE_DAYS,
  VOTE_DECAY_PER_DAY,
  CAPTCHA_SITEKEY,
  captchaEnabled,
  fetchVoteSummary,
  fetchMyVotes,
  fetchCampaignsThisWeek,
  castVote,
  startCampaign,
  formatUpvoteScore,
} from '../lib/votes.js'
import Captcha from '../lib/captcha.jsx'
import SubmissionList from '../components/SubmissionList.jsx'
import { ADUO } from '../lib/aduo.js'
import { CATEGORIES } from '../data/schema.js'
import { TOOL_BY_ID } from '../data/tools.js'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'
import Monogram from '../components/Monogram.jsx'
import Collapsible from '../components/Collapsible.jsx'
import { toolHref } from '../lib/urls.js'

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

/** Explanation only. The rule itself is enforced server-side in cast-vote. */
function voteBlockReason({ user, accountAgeDays }) {
  if (!user) return 'Sign in to vote.'
  if (accountAgeDays !== null && accountAgeDays < VOTE_MIN_ACCOUNT_AGE_DAYS) {
    return `Your account is ${accountAgeDays} day${accountAgeDays === 1 ? '' : 's'} old. Voting opens at ${VOTE_MIN_ACCOUNT_AGE_DAYS} days.`
  }
  return null
}

function VoteButton({ active, disabled, onClick, children, tone = 'neutral' }) {
  const activeClass =
    tone === 'good'
      ? 'border-good bg-good-soft text-good'
      : 'border-bad bg-bad-soft text-bad'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center rounded-md border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[36px] ${
        active ? activeClass : 'border-line bg-white text-ink-soft hover:border-ink-faint'
      }`}
    >
      {children}
    </button>
  )
}

function VoteBlock({ listing, summary, myVote, campaign, blockedReason, busy, captchaOpen, onVote, onVerify, onCancel }) {
  const s = summary ?? { upvoteScore: 0, up: 0, down: 0, total: 0 }

  return (
    <div className="mt-3 rounded-md border border-accent/25 bg-accent-soft/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
          Community signal
        </span>
        <span className="text-[11px] text-ink-faint">
          {s.up} up · {s.down} down
        </span>
      </div>

      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-accent-ink">
        {formatUpvoteScore(s.upvoteScore)}
      </p>
      <p className="text-[11px] leading-snug text-ink-faint">
        Old votes fade {Math.round(VOTE_DECAY_PER_DAY * 100)}% a day. A separate signal — never added to
        the transparency score.
      </p>

      {campaign && (
        <p className="mt-2 rounded border border-mixed/40 bg-mixed-soft px-2 py-1 text-[11px] text-mixed">
          Being promoted this week
          {campaign.note ? `: “${campaign.note}”` : ''}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <VoteButton
          tone="good"
          active={myVote === 1}
          disabled={Boolean(blockedReason) || busy}
          onClick={() => onVote(1)}
        >
          Vouch for it
        </VoteButton>
        <VoteButton
          tone="bad"
          active={myVote === -1}
          disabled={Boolean(blockedReason) || busy}
          onClick={() => onVote(-1)}
        >
          Disapprove
        </VoteButton>
        {busy && <span className="text-[11px] text-ink-faint">Saving…</span>}
        {myVote && !busy && (
          <span className="text-[11px] text-ink-faint">
            Your vote is recorded. You can change it or pick the other side.
          </span>
        )}
      </div>

      {blockedReason && <p className="mt-2 text-[11px] text-ink-faint">{blockedReason}</p>}

      {captchaOpen && (
        <div className="mt-3 rounded border border-line bg-white p-3">
          <p className="mb-2 text-[11px] text-ink-soft">
            One check before your vote counts. It stops scripted voting, not you.
          </p>
          <Captcha
            sitekey={CAPTCHA_SITEKEY}
            onVerify={onVerify}
            onExpire={() => onCancel()}
            onError={onCancel}
          />
          <button
            type="button"
            onClick={onCancel}
            className="mt-2 text-[11px] text-ink-faint underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function ListingCard({ listing, summary, myVote, campaign, blockedReason, busy, captchaOpen, onVote, onVerify, onCancel }) {
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
        {listing.aduo_granted_at && (
          <Pill
            tone="accent"
            title="A disclosed, founder-granted visibility boost against unratified thresholds. It reorders the directory only."
          >
            ADUO boost
          </Pill>
        )}
      </div>

      {listing.blurb && <p className="mt-3 text-sm text-ink-soft">{listing.blurb}</p>}
      {listing.claimed_description && (
        <p className="mt-2 text-xs text-ink-faint">Claimed at submission: “{listing.claimed_description}”</p>
      )}

      <VoteBlock
        listing={listing}
        summary={summary}
        myVote={myVote}
        campaign={campaign}
        blockedReason={blockedReason}
        busy={busy}
        captchaOpen={captchaOpen}
        onVote={onVote}
        onVerify={onVerify}
        onCancel={onCancel}
      />

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        {listing.verified_at && (
          <span className="text-[11px] text-ink-faint">
            ownership confirmed {new Date(listing.verified_at).toISOString().slice(0, 10)}
          </span>
        )}
        {linked && (
          <Link to={toolHref(linked)} className="ml-auto text-xs text-accent underline underline-offset-2">
            transparency row →
          </Link>
        )}
      </div>
    </article>
  )
}

const MINE_FIELDS =
  'id, name, url, category, blurb, claimed_description, status, snippet_state, review_required, warning_message, editable_until, submitted_at'

async function fetchMine(userId) {
  if (!supabase || !userId) return []
  const { data } = await supabase
    .from('listings')
    .select(MINE_FIELDS)
    .eq('owner_id', userId)
    .order('submitted_at', { ascending: false })
  return data ?? []
}

export default function Directory() {
  const { user, configured, accountAgeDays } = useAuth()
  const [listings, setListings] = useState([])
  const [mine, setMine] = useState([])
  const [summary, setSummary] = useState({})
  const [myVotes, setMyVotes] = useState({})
  const [campaigns, setCampaigns] = useState({})
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState(null)

  const [busyId, setBusyId] = useState(null)
  const [captchaFor, setCaptchaFor] = useState(null)
  const [voteError, setVoteError] = useState(null)
  const [campaignNote, setCampaignNote] = useState('')
  const [notice, setNotice] = useState(null)
  const [aduoOpen, setAduoOpen] = useState(null)
  const [aduoForm, setAduoForm] = useState({})
  const [aduoBusy, setAduoBusy] = useState(false)
  const [aduoApps, setAduoApps] = useState({})

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('listings')
      .select('id, name, url, category, blurb, claimed_description, snippet_state, verified_at, linked_tool_id, owner_id, aduo_granted_at')
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
      setAduoApps({})
      return
    }
    supabase
      .from('aduo_applications')
      .select('listing_id, status, decision_reason, created_at')
      .eq('requested_by', user.id)
      .then(({ data }) =>
        setAduoApps(Object.fromEntries((data ?? []).map((a) => [a.listing_id, a])))
      )
  }, [user])

  useEffect(() => {
    if (!supabase) return
    Promise.all([fetchVoteSummary(), fetchMyVotes(user?.id), fetchCampaignsThisWeek()]).then(
      ([s, v, c]) => {
        setSummary(s)
        setMyVotes(v)
        setCampaigns(c)
      }
    )
  }, [user?.id])

  useEffect(() => {
    if (!supabase || !user) {
      setMine([])
      return
    }
    fetchMine(user.id).then(setMine)
  }, [user])

  const refreshVotes = async () => {
    const [s, v] = await Promise.all([fetchVoteSummary(), fetchMyVotes(user?.id)])
    setSummary(s)
    setMyVotes(v)
  }

  const submitVote = async (listingId, value, token) => {
    setBusyId(listingId)
    setVoteError(null)
    const { data, error: castError } = await castVote({ listingId, value, captchaToken: token })
    setBusyId(null)
    setCaptchaFor(null)

    if (castError) {
      setVoteError(castError)
      return
    }
    setSummary((s) => ({ ...s, [listingId]: { upvoteScore: data.upvoteScore, ...data.totals } }))
    setMyVotes((v) => ({ ...v, [listingId]: value }))
  }

  const requestVote = (listingId, value) => {
    if (captchaEnabled) setCaptchaFor({ listingId, value })
    else submitVote(listingId, value, undefined)
  }

  const promote = async (listingId) => {
    const { error: campaignError } = await startCampaign({ listingId, note: campaignNote })
    setCampaignNote('')
    if (campaignError) {
      setNotice(campaignError)
      return
    }
    setCampaigns(await fetchCampaignsThisWeek())
  }

  const applyAduo = async (listingId) => {
    setAduoBusy(true)
    setNotice(null)
    const { error: applyError } = await supabase.from('aduo_applications').insert({
      listing_id: listingId,
      requested_by: user.id,
      traffic_evidence: aduoForm.traffic || null,
      reviews_evidence: aduoForm.reviews || null,
      applicant_note: aduoForm.note || null,
    })
    setAduoBusy(false)
    if (applyError) {
      setNotice(
        /duplicate key|unique/i.test(applyError.message)
          ? 'You already have an open ADUO application for this listing.'
          : applyError.message
      )
      return
    }
    setAduoOpen(null)
    setAduoForm({})
    setNotice('Application submitted. A person reviews it — nothing is granted automatically.')
    const { data } = await supabase
      .from('aduo_applications')
      .select('listing_id, status, decision_reason, created_at')
      .eq('requested_by', user.id)
    setAduoApps(Object.fromEntries((data ?? []).map((a) => [a.listing_id, a])))
  }

  // ADUO boosts sit above the rest, which is the whole point of the mechanism.
  // It reorders the directory only — never the Phase 1 comparison.
  const orderedListings = [...listings].sort((a, b) => {
    const boost = (x) => (x.aduo_granted_at ? 1 : 0)
    if (boost(b) !== boost(a)) return boost(b) - boost(a)
    const score = (x) => Number(summary[x.id]?.upvoteScore ?? 0)
    if (score(b) !== score(a)) return score(b) - score(a)
    return new Date(b.verified_at ?? 0) - new Date(a.verified_at ?? 0)
  })

  const blockedReason = voteBlockReason({ user, accountAgeDays })

  return (
    <div className="space-y-7 sm:space-y-10">
      <header className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="accent">Phase 2 — live</Pill>
          <Pill tone="neutral">Ownership verified · voting live</Pill>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-ink">Directory</h1>
        <p className="mt-2 text-ink-soft">
          Community-submitted tools, each proven to be controlled by the person who submitted it. This is a
          separate axis from the transparency database: Phase 1 answers “is it honest with my data”, this
          answers “do real users vouch for it”.
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

      <Callout variant="rule" title="Two signals, never one number">
        The transparency score comes from reading a tool’s own policies. The community signal comes from
        accounts that vouched for it. They are computed separately, stored separately, and shown
        separately. A tool can score 92 on transparency and have no upvotes, or be widely liked and
        careless with data. Nothing on this site adds them together.
      </Callout>

      {!configured && (
        <Callout variant="warn" title="The directory needs a Supabase project">
          Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>, run{' '}
          <code className="font-mono text-xs">supabase/migrations/0001_phase2_directory.sql</code> and{' '}
          <code className="font-mono text-xs">0002_voting.sql</code>, and deploy{' '}
          <code className="font-mono text-xs">verify-snippet</code> and{' '}
          <code className="font-mono text-xs">cast-vote</code>. Until then this page shows no listings —
          which is the honest state, not an error.
        </Callout>
      )}

      {!captchaEnabled && configured && (
        <Callout variant="warn" title="Captcha is not configured">
          Voting works, but nothing is stopping a script from voting yet. Set{' '}
          <code className="font-mono text-xs">VITE_HCAPTCHA_SITEKEY</code> and{' '}
          <code className="font-mono text-xs">HCAPTCHA_SECRET</code> as a function secret to close that.
        </Callout>
      )}

      {error && <Callout variant="danger">Could not load listings: {error}</Callout>}
      {voteError && <Callout variant="danger">{voteError}</Callout>}

      {configured && (
        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-ink">Listed tools</h2>
          <p className="text-xs text-ink-faint">
            Ordered by: ADUO boosts first, then community signal. ADUO affects this list only — never
            a transparency score or the public comparison.
          </p>
          {loading ? (
            <p className="mt-2 text-sm text-ink-soft">Loading…</p>
          ) : listings.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Nothing listed yet. A listing appears here only once its ownership tag has been confirmed.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orderedListings.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  summary={summary[l.id]}
                  myVote={myVotes[l.id]}
                  campaign={campaigns[l.id]}
                  blockedReason={blockedReason}
                  busy={busyId === l.id}
                  captchaOpen={captchaFor?.listingId === l.id}
                  onVote={(value) => requestVote(l.id, value)}
                  onVerify={(token) => submitVote(l.id, captchaFor.value, token)}
                  onCancel={() => setCaptchaFor(null)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {mine.length > 0 && (
        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-ink">Your submissions</h2>
          {notice && (
            <Callout variant="danger" className="mt-3">
              {notice}
            </Callout>
          )}
          <SubmissionList
            className="mt-3"
            listings={mine}
            onChanged={() => fetchMine(user?.id).then(setMine)}
            extra={(l) => (
              <>
                {l.status === 'listed' && !campaigns[l.id] ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
                    <label className="min-w-0 flex-1 text-[11px] text-ink-faint sm:min-w-[12rem]">
                      Promote this week (one campaign per submitter per week)
                      <input
                        value={campaignNote}
                        onChange={(e) => setCampaignNote(e.target.value)}
                        placeholder="Why people should look at it"
                        className="mt-1 min-h-[44px] w-full rounded-md border border-line px-2 py-2 text-xs text-ink sm:min-h-0 sm:py-1.5"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => promote(l.id)}
                      className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-ink-faint sm:min-h-[36px]"
                    >
                      Start campaign
                    </button>
                  </div>
                ) : campaigns[l.id] ? (
                  <p className="mt-3 border-t border-line pt-3 text-[11px] text-ink-faint">
                    You are promoting this listing this week. Campaigns are shown publicly on the card,
                    and you get one per week.
                  </p>
                ) : null}

                {l.status === 'listed' && (
                  <div className="mt-3 border-t border-line pt-3">
                    {l.aduo_granted_at ? (
                      <p className="text-[11px] text-ink-faint">
                        ADUO boost granted{' '}
                        {new Date(l.aduo_granted_at).toISOString().slice(0, 10)}. The listing is shown
                        above the others in this directory. It grants nothing in the comparison.
                      </p>
                    ) : aduoApps[l.id] ? (
                      <p className="text-[11px] text-ink-faint">
                        ADUO application: <strong className="text-ink">{aduoApps[l.id].status}</strong>.{' '}
                        {aduoApps[l.id].decision_reason
                          ? `Reason given: ${aduoApps[l.id].decision_reason}`
                          : 'A person reviews it — nothing is granted automatically.'}
                      </p>
                    ) : aduoOpen === l.id ? (
                      <div className="space-y-2 rounded-md border border-line bg-paper p-3">
                        <p className="text-[11px] font-medium text-ink">Apply for an ADUO boost</p>
                        <p className="text-[11px] leading-snug text-ink-faint">
                          Traffic trend and external reviews cannot be checked from here — this site
                          runs no analytics and has no review provider. Point to the evidence and a
                          person verifies it. Nothing is decided by a machine, and the thresholds are
                          not yet ratified.
                        </p>
                        <input
                          value={aduoForm.traffic ?? ''}
                          onChange={(e) => setAduoForm({ ...aduoForm, traffic: e.target.value })}
                          placeholder="Traffic evidence — a public source a reviewer can open"
                          className="min-h-[44px] w-full rounded-md border border-line px-2 py-2 text-xs text-ink sm:min-h-0 sm:py-1.5"
                        />
                        <input
                          value={aduoForm.reviews ?? ''}
                          onChange={(e) => setAduoForm({ ...aduoForm, reviews: e.target.value })}
                          placeholder="Review evidence — app store, forum, anywhere off-site"
                          className="min-h-[44px] w-full rounded-md border border-line px-2 py-2 text-xs text-ink sm:min-h-0 sm:py-1.5"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => applyAduo(l.id)}
                            disabled={aduoBusy}
                            className="inline-flex min-h-[44px] items-center rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 sm:min-h-[36px]"
                          >
                            {aduoBusy ? 'Submitting…' : 'Submit application'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAduoOpen(null)}
                            className="inline-flex min-h-[44px] items-center rounded-md px-3 py-1.5 text-xs text-ink-faint sm:min-h-[36px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAduoForm({})
                          setAduoOpen(l.id)
                        }}
                        className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-ink-faint sm:min-h-[36px]"
                      >
                        Apply for ADUO boost
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          />
        </section>
      )}

      <section>
        <h2 className="text-lg sm:text-xl font-semibold text-ink">The warning an owner receives</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Published in full, because a warning people cannot see is a warning that can quietly get worse
          later. This is the exact text the weekly check writes to a listing when a previously confirmed
          tag stops confirming.
        </p>
        <Collapsible
          title="Read the exact message"
          collapseOnDesktop
          defaultOpen
          className="mt-3"
        >
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-ink-soft">
            {SAMPLE_WARNING.text}
          </pre>
        </Collapsible>
      </section>

      <Collapsible
        collapseOnDesktop
        defaultOpen
        titleClassName="text-base font-semibold text-ink"
        title={
          <span className="flex flex-wrap items-center gap-2">
            ADUO — balance-of-performance boost
            <Pill tone="accent">Mechanism live</Pill>
            <Pill tone="unknown">Thresholds UNRATIFIED</Pill>
          </span>
        }
      >
        <p className="max-w-3xl text-sm text-ink-soft">
          Named after F1-style performance balancing: a listing with few upvotes but strong underlying
          signals gets extra visibility, so good undiscovered tools are not buried under incumbents who won
          early and snowballed on raw vote count.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          You can apply from your own listings. A person reviews every application and records what
          the decision was based on. <strong className="text-ink">No listing is boosted
          automatically</strong> — not by crossing a threshold, not by waiting long enough. Every
          grant is a manual founder decision, shown on the listing, and written to the audit log.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Of the four criteria, two are checked by the machine (the transparency score of the linked
          Phase 1 row, and the upvote ceiling) and two cannot be (traffic trend and external reviews —
          this site runs no analytics and has no review provider). Those two come from evidence you
          supply and a human verifies. A boost reorders <em>this directory only</em>. It never touches
          a transparency score or the public comparison.
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
          These thresholds are proposed, not decided. They must be ratified <strong>before</strong> the
          first grant, not after: deciding the bar once you can see who clears it turns a rule into a
          favour. The mechanism below runs against them and marks them as unratified everywhere they
          appear — but until they are agreed, every grant is a provisional decision that will need to
          be revisited once they are.
        </Callout>

        <Callout variant="note" className="mt-3" title="Known gap">
          Traffic data is least reliable for exactly the earliest-stage tools ADUO is meant to help. For
          very early submissions, evaluate on reviews and ToS score alone, and add traffic once it exists.
        </Callout>
      </Collapsible>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-bad/30 bg-bad-soft p-4">
          <h2 className="text-sm font-semibold text-bad">Hard rules (same category as the one rule)</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>Review turnaround is never purchasable or expeditable.</li>
            <li>Ranking position and upvote counts are never purchasable or boostable.</li>
            <li>Upvote score and ToS transparency rating stay separate and clearly labelled — never one combined score.</li>
          </ul>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent-soft/50 p-4">
          <h2 className="text-sm font-semibold text-accent-ink">Anti-gaming, as built</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>
              One vote per account, enforced by the table’s primary key — a second attempt is a conflict,
              not a second vote.
            </li>
            <li>
              Account must be {VOTE_MIN_ACCOUNT_AGE_DAYS} days old. Checked in the database, so the browser
              cannot talk its way past it.
            </li>
            <li>
              Captcha before the vote counts, verified server-side in <code className="font-mono text-xs">cast-vote</code>.
            </li>
            <li>Old votes fade {Math.round(VOTE_DECAY_PER_DAY * 100)}% a day, so a pile-on cannot have a permanent effect.</li>
            <li>One promotion campaign per submitter per week, shown publicly on the card.</li>
          </ul>
        </div>
      </section>

      <Callout variant="rule" title="What listing does not mean">
        A confirmed tag proves control of a domain and that the site matches what was claimed. It is not a
        quality mark, not a safety endorsement, and it changes nothing in the Phase 1 transparency
        database. See{' '}
        <Link to="/charter" className="underline underline-offset-2">
          the one rule
        </Link>
        .
      </Callout>
    </div>
  )
}
