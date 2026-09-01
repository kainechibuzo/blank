import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import { makeToken, snippetTag } from '../lib/snippet.js'
import { siteKeyOf } from '../lib/sites.js'
import { describeEdgeFailure } from '../lib/edge.js'
import { CATEGORIES } from '../data/schema.js'
import { TOOLS } from '../data/tools.js'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'

const OUTCOMES = {
  ok: { tone: 'good', text: 'Ownership confirmed — the listing is now public and will be re-checked weekly.' },
  missing: { tone: 'mixed', text: 'Tag not found yet. Add it to your <head>, then press Verify again.' },
  altered: { tone: 'mixed', text: 'A tag was found but its content does not match the one issued to you.' },
  unreachable: { tone: 'unknown', text: 'The page could not be fetched. Check the URL is publicly reachable.' },
}

export default function SubmitListing() {
  const { user, configured } = useAuth()
  const [form, setForm] = useState({ name: '', url: '', category: 'assistant', blurb: '', claimed_description: '', linked_tool_id: '' })
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)
  const [verifyState, setVerifyState] = useState(null)
  const [error, setError] = useState(null)
  const [duplicate, setDuplicate] = useState(null)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  if (!configured) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Submit a tool</h1>
        <Callout variant="warn" title="Submissions are closed">
          The directory needs a Supabase project before it can accept anything. See{' '}
          <code className="font-mono text-xs">.env.example</code>.
        </Callout>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Submit a tool</h1>
        <Callout variant="note" title="Sign in first">
          Submissions need an owner so that ownership can be proven and re-checked.{' '}
          <Link to="/account" className="underline underline-offset-2">
            Sign in or create an account
          </Link>
          .
        </Callout>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setDuplicate(null)
    const token = makeToken()
    const url = form.url.startsWith('http') ? form.url : `https://${form.url}`

    // Check before writing, so a submitter whose first attempt looked broken
    // does not end up with three copies of the same claim.
    const { data: existing } = await supabase
      .from('listings')
      .select('id, name, status, snippet_state')
      .eq('owner_id', user.id)
      .eq('site_key', siteKeyOf(url))
      .maybeSingle()

    if (existing) {
      setSaving(false)
      setDuplicate(existing)
      return
    }

    const { data, error: insertError } = await supabase
      .from('listings')
      .insert({
        owner_id: user.id,
        name: form.name,
        url,
        category: form.category,
        blurb: form.blurb || null,
        claimed_description: form.claimed_description || null,
        linked_tool_id: form.linked_tool_id || null,
        verify_token: token,
        status: 'pending',
        snippet_state: 'unchecked',
      })
      .select()
      .single()

    setSaving(false)
    if (insertError) {
      // The database is the real guard; this just says it in words.
      setError(
        /duplicate key|unique/i.test(insertError.message)
          ? 'You have already submitted this site. One submission per site, per account.'
          : insertError.message
      )
      return
    }
    setCreated(data)
  }

  const verify = async () => {
    setVerifyState({ busy: true })
    let response = null
    try {
      const invoked = await supabase.functions.invoke('verify-snippet', {
        body: { listingId: created.id },
      })
      response = invoked.response
      const { data, error: fnError } = invoked
      if (fnError) throw fnError
      setVerifyState({ busy: false, outcome: data?.outcome ?? 'unreachable', note: data?.note })
      setCreated({ ...created, snippet_state: data?.outcome ?? 'unreachable', status: data?.outcome === 'ok' ? 'listed' : created.status })
    } catch (err) {
      // Never infer "not deployed" from the wording of a reply. The error class
      // and HTTP status are the signal; see src/lib/edge.js.
      const failure = await describeEdgeFailure(err?.name ? err : null, response ?? err?.context)
      setVerifyState({ busy: false, error: failure.message, failure })
    }
  }

  if (created) {
    const outcome = verifyState?.outcome
    const info = outcome ? OUTCOMES[outcome] : null
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Verify ownership</h1>
        <p className="text-sm text-ink-soft">
          One static line of HTML proves whoever controls the site submitted it. No script, no tracking, no access to
          anything — and you can remove it yourself whenever you like.
        </p>

        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Add this to your homepage head</p>
          <pre className="mt-2 overflow-x-auto rounded bg-paper p-3 font-mono text-xs text-ink">
            {snippetTag(created.verify_token)}
          </pre>
          <p className="mt-3 text-xs text-ink-soft">
            The bot crawls the public page once now, then once a week. It requests no credentials and follows no
            authenticated routes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={verify}
            disabled={verifyState?.busy}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {verifyState?.busy ? 'Checking…' : 'Verify now'}
          </button>
          <Pill tone={created.snippet_state === 'ok' ? 'good' : 'unknown'}>snippet: {created.snippet_state}</Pill>
          <Pill tone={created.status === 'listed' ? 'good' : 'unknown'}>{created.status}</Pill>
        </div>

        {info && <Callout variant={info.tone}>{info.text}</Callout>}
        {verifyState?.note && <p className="text-xs text-ink-faint">{verifyState.note}</p>}
        {verifyState?.error && <Callout variant="warn">{verifyState.error}</Callout>}

        <Link to="/directory" className="text-sm text-accent underline underline-offset-2">
          Back to the directory
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Submit a tool</h1>
      <Callout variant="note" title="What listing does and does not mean">
        Listing proves you control the site. It is not a quality mark, not a safety review, and it has no effect on the
        Phase 1 transparency database or any score in it.
      </Callout>

      {duplicate && (
        <Callout variant="warn" title="You have already submitted this site">
          <strong className="text-ink">{duplicate.name}</strong> — {duplicate.status}, snippet{' '}
          {duplicate.snippet_state}. One submission per site, per account, so a claim cannot be
          duplicated by accident.{' '}
          <Link to="/directory" className="text-accent underline underline-offset-2">
            Go to your submission
          </Link>{' '}
          to re-check it or fix it.
        </Callout>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-white p-4">
        <label className="block text-xs text-ink-faint">
          Product or site name
          <input required value={form.name} onChange={set('name')} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink" />
        </label>
        <label className="block text-xs text-ink-faint">
          Public URL (homepage — this is what gets crawled)
          <input required value={form.url} onChange={set('url')} placeholder="example.com" className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink" />
        </label>
        <label className="block text-xs text-ink-faint">
          Category
          <select value={form.category} onChange={set('category')} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink">
            {Object.entries(CATEGORIES).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-ink-faint">
          What it is, in one line
          <input value={form.blurb} onChange={set('blurb')} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink" />
        </label>
        <label className="block text-xs text-ink-faint">
          What you claim the site is, in your own words
          <input
            value={form.claimed_description}
            onChange={set('claimed_description')}
            placeholder="e.g. a music discovery site"
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink"
          />
          <span className="mt-1 block text-[11px] text-ink-faint">
            The review bot checks the live site against this claim. Be specific enough to be checkable.
          </span>
        </label>
        <label className="block text-xs text-ink-faint">
          Already in the transparency database? (optional, display only)
          <select value={form.linked_tool_id} onChange={set('linked_tool_id')} className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink">
            <option value="">No link</option>
            {TOOLS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <button disabled={saving} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {saving ? 'Submitting…' : 'Submit and get verification tag'}
        </button>
        {error && <Callout variant="danger">{error}</Callout>}
      </form>
    </div>
  )
}
