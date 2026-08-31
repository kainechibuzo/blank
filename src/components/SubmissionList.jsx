import { useState } from 'react'
import { EDIT_WINDOW_HOURS, editWindowOpen, editWindowRemaining, updateListing, requestVerification } from '../lib/listings.js'
import { CATEGORIES } from '../data/schema.js'
import { SUPPORT_EMAIL } from '../lib/supabase.js'
import Callout from './Callout.jsx'
import Pill from './Pill.jsx'

const SNIPPET_TONE = { ok: 'good', altered: 'mixed', missing: 'mixed', unreachable: 'unknown', unchecked: 'neutral' }

/**
 * One implementation of "your submission", shared by /account and /directory,
 * so the edit button cannot exist on one page and be missing from the other —
 * which is exactly what happened the first time.
 *
 * `extra` is a render slot for page-specific controls (the promotion campaign
 * on /directory) so both pages stay identical where it matters.
 */
export default function SubmissionList({ listings, onChanged, extra, className = '' }) {
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)
  const [verifyBusyId, setVerifyBusyId] = useState(null)
  const [message, setMessage] = useState(null)

  const startEdit = (l) => {
    setMessage(null)
    setEditingId(l.id)
    setForm({
      name: l.name ?? '',
      url: l.url ?? '',
      category: l.category ?? 'assistant',
      blurb: l.blurb ?? '',
      claimed_description: l.claimed_description ?? '',
    })
  }

  const save = async (id) => {
    setBusy(true)
    setMessage(null)
    const { data, error } = await updateListing(id, form)
    setBusy(false)
    if (error) {
      setMessage({ tone: 'bad', text: error })
      return
    }
    setEditingId(null)
    setMessage({
      tone: 'good',
      text: 'Saved. If you changed the address, the listing goes back to pending until it is verified again.',
    })
    onChanged?.({ ...data, id })
  }

  const recheck = async (id) => {
    setVerifyBusyId(id)
    setMessage(null)
    const { data, error } = await requestVerification(id)
    setVerifyBusyId(null)
    if (error) {
      setMessage({ tone: 'bad', text: error })
      return
    }
    setMessage({
      tone: data.outcome === 'ok' ? 'good' : 'warn',
      text: data.outcome === 'ok' ? 'Ownership confirmed.' : `Tag ${data.outcome}. ${data.note ?? ''}`.trim(),
    })
    onChanged?.({ id, snippet_state: data.outcome, status: data.outcome === 'ok' ? 'listed' : undefined })
  }

  return (
    <ul className={`space-y-3 ${className}`}>
      {listings.map((l) => (
        <li key={l.id} className="rounded-lg border border-line bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink">{l.name}</span>
            <span className="flex flex-wrap gap-1">
              <Pill tone={l.status === 'listed' ? 'good' : l.status === 'delisted' ? 'bad' : 'unknown'}>
                {l.status}
              </Pill>
              <Pill tone={SNIPPET_TONE[l.snippet_state] ?? 'neutral'}>snippet: {l.snippet_state}</Pill>
              {l.review_required && <Pill tone="bad">human review pending</Pill>}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-ink-faint">{l.url}</p>

          {extra?.(l)}

          {/* Fixing a mistake is allowed for a day; asking to be re-checked is
              allowed always. */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {editWindowOpen(l) ? (
              <>
                <button
                  type="button"
                  onClick={() => (editingId === l.id ? setEditingId(null) : startEdit(l))}
                  className="inline-flex min-h-[44px] items-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-ink-faint sm:min-h-[36px]"
                >
                  {editingId === l.id ? 'Cancel' : 'Edit'}
                </button>
                <span className="text-[11px] text-ink-faint">editable for {editWindowRemaining(l)}</span>
              </>
            ) : (
              <span className="text-[11px] text-ink-faint">
                The {EDIT_WINDOW_HOURS}-hour editing window has closed. Email {SUPPORT_EMAIL} to change
                anything now.
              </span>
            )}
            <button
              type="button"
              onClick={() => recheck(l.id)}
              disabled={verifyBusyId === l.id}
              className="ml-auto inline-flex min-h-[44px] items-center rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:border-ink-faint disabled:opacity-50 sm:min-h-[36px]"
            >
              {verifyBusyId === l.id ? 'Checking…' : 'Re-check snippet'}
            </button>
          </div>

          {editingId === l.id && (
            <div className="mt-3 space-y-3 rounded-md border border-line bg-paper p-3">
              <label className="block text-[11px] text-ink-faint">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-line px-2 py-2 text-sm text-ink sm:min-h-0 sm:py-1.5"
                />
              </label>
              <label className="block text-[11px] text-ink-faint">
                Public URL
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-line px-2 py-2 text-sm text-ink sm:min-h-0 sm:py-1.5"
                />
              </label>
              <label className="block text-[11px] text-ink-faint">
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-line bg-white px-2 py-2 text-sm text-ink sm:min-h-0 sm:py-1.5"
                >
                  {Object.entries(CATEGORIES).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[11px] text-ink-faint">
                What it is, in your own words
                <input
                  value={form.claimed_description}
                  onChange={(e) => setForm({ ...form, claimed_description: e.target.value })}
                  className="mt-1 min-h-[44px] w-full rounded-md border border-line px-2 py-2 text-sm text-ink sm:min-h-0 sm:py-1.5"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => save(l.id)}
                  disabled={busy}
                  className="inline-flex min-h-[44px] items-center rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 sm:min-h-[36px]"
                >
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
                <span className="text-[11px] text-ink-faint">
                  Changing the address sends the listing back to pending until it is verified again.
                </span>
              </div>
            </div>
          )}

          {message && (
            <Callout
              variant={message.tone === 'good' ? 'rule' : message.tone === 'warn' ? 'warn' : 'danger'}
              className="mt-3"
            >
              {message.text}
            </Callout>
          )}

          {l.review_required && (
            <div className="mt-3 rounded border-l-2 border-mixed/50 bg-mixed-soft/60 px-3 py-2">
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
  )
}
