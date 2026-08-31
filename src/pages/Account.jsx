import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { supabase } from '../lib/supabase.js'
import Callout from '../components/Callout.jsx'
import Pill from '../components/Pill.jsx'
import SubmissionList from '../components/SubmissionList.jsx'

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

export default function Account() {
  const { user, profile, loading, configured, accountAgeDays, isFounder, signUp, signIn, signInWithGoogle, signOut } =
    useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [mine, setMine] = useState([])

  useEffect(() => {
    if (!supabase || !user) {
      setMine([])
      return
    }
    fetchMine(user.id).then(setMine)
  }, [user])

  if (!configured) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Account</h1>
        <Callout variant="warn" title="Accounts are not configured yet">
          Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> in <code className="font-mono text-xs">.env</code>{' '}
          (see <code className="font-mono text-xs">.env.example</code>) and restart the dev server. Until then the
          directory is read-only and nothing accepts submissions — which is the correct state for an unprovisioned
          checkout, not a bug.
        </Callout>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (error) {
      setMessage({ tone: 'bad', text: error.message })
    } else if (mode === 'signup') {
      setMessage({ tone: 'good', text: 'Check your email to confirm the address, then sign in.' })
    }
  }

  const google = async () => {
    setBusy(true)
    const { error } = await signInWithGoogle()
    setBusy(false)
    if (error) setMessage({ tone: 'bad', text: error.message })
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
        <p className="text-sm text-ink-soft">
          Accounts exist so submissions and votes have an owner and an age. Nothing here is used to rank the Phase 1
          comparison.
        </p>

        <form onSubmit={submit} className="space-y-3 rounded-lg border border-line bg-white p-4">
          <label className="block text-xs text-ink-faint">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="block text-xs text-ink-faint">
            Password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="w-full rounded-md border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            Continue with Google
          </button>
        </form>

        {message && <Callout variant={message.tone === 'bad' ? 'danger' : 'rule'}>{message.text}</Callout>}

        <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="text-sm text-accent underline underline-offset-2">
          {mode === 'signin' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">Account</h1>
        <button onClick={signOut} className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft">
          Sign out
        </button>
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <p className="text-sm text-ink">{user.email}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill tone={isFounder ? 'accent' : 'neutral'}>{isFounder ? 'Founder' : (profile?.role ?? 'user')}</Pill>
          <Pill tone="neutral" title="Account age is the anti-gaming input for voting (Stage 2).">
            Account age: {accountAgeDays === null ? 'unknown' : `${accountAgeDays} day${accountAgeDays === 1 ? '' : 's'}`}
          </Pill>
        </div>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Your submissions</h2>
          <Link to="/directory/submit" className="text-sm text-accent underline underline-offset-2">
            Submit a tool
          </Link>
        </div>

        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nothing submitted yet.</p>
        ) : (
          <SubmissionList
            className="mt-3"
            listings={mine}
            onChanged={() => fetchMine(user?.id).then(setMine)}
          />
        )}
      </section>
    </div>
  )
}
