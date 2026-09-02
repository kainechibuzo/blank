import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { SITE } from '../data/schema.js'
import { useAuth } from '../lib/auth.jsx'

/**
 * SiteHeader — 64px, sticky, and short enough to read at a glance.
 *
 *   logo left · [Compare] [Discover] [Directory] right of centre · [Sign in]
 *
 * The old header carried two rows of navigation plus group labels. It was
 * built for someone arriving to audit the site; this one is built for someone
 * arriving to ask a question. Everything it drops is still reachable from the
 * footer.
 */

const USE_NAV = [
  { to: '/compare', label: 'Compare' },
  { to: '/discover', label: 'Discover' },
  { to: '/directory', label: 'Directory' },
]

/* Governance pages are not in the main row — a first-time visitor does not
   need them — but they are one tap away in the drawer and listed in the
   footer, because a site that hides its own rules is not a transparency site. */
const RULES_NAV = [
  { to: '/methodology', label: 'Methodology' },
  { to: '/charter', label: 'The one rule' },
  { to: '/sponsors', label: 'Sponsors' },
]

function navClass({ isActive }) {
  return [
    'inline-flex h-11 items-center rounded px-2 text-sm transition-colors',
    isActive ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink',
  ].join(' ')
}

function SignInButton({ full = false }) {
  return (
    <Link
      to="/account"
      className={`inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-medium text-ink hover:border-ink-faint ${
        full ? 'w-full' : ''
      }`}
    >
      Sign in
    </Link>
  )
}

function AuthArea({ full = false }) {
  const { user, loading, configured, signOut } = useAuth()

  if (loading) return <div className="h-11 w-24 animate-pulse rounded-md bg-line/40" aria-hidden="true" />

  if (!user) return <SignInButton full={full} />

  return (
    <div className={`flex items-center gap-1 ${full ? 'w-full' : ''}`}>
      <Link
        to="/account"
        title={configured ? user.email : 'Supabase is not configured'}
        className="inline-flex h-11 min-w-0 items-center gap-2 rounded-md px-2 text-sm text-ink-soft hover:text-ink"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent-ink">
          {user.email?.slice(0, 1).toUpperCase() ?? '?'}
        </span>
        <span className="truncate">{user.email}</span>
      </Link>
      <button
        type="button"
        onClick={() => signOut()}
        className="inline-flex h-11 shrink-0 items-center rounded-md px-2 text-sm text-ink-faint hover:text-ink"
      >
        Sign out
      </button>
    </div>
  )
}

function Drawer({ open, onClose }) {
  const { pathname } = useLocation()
  const { isFounder } = useAuth()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    // Focus the panel so a keyboard user is not left behind it, and so Escape
    // and Tab go somewhere sensible.
    panelRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      id="site-menu"
      /* Capped and scrollable: a menu taller than the viewport leaves nothing
         of the page reachable behind it. */
      className="max-h-[75vh] overflow-y-auto border-t border-line bg-paper md:hidden"
    >
      <div className="mx-auto max-w-6xl px-4 py-3">
        <nav aria-label="Main" className="flex flex-col">
          {USE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex min-h-[48px] items-center border-b border-line/60 text-[15px] ${
                  isActive ? 'font-medium text-ink' : 'text-ink-soft'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="py-3">
          <AuthArea full />
        </div>

        <nav aria-label="How this site is governed" className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line/60 pt-3">
          {RULES_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="min-h-[44px] content-center text-sm text-ink-faint hover:text-ink"
            >
              {item.label}
            </NavLink>
          ))}
          {/* Founder-only, and deliberately kept out of the desktop row: the
              review queue is not a destination for people reading the site. */}
          {isFounder && (
            <NavLink
              to="/admin"
              onClick={onClose}
              className="min-h-[44px] content-center text-sm text-ink-faint hover:text-ink"
            >
              Admin
            </NavLink>
          )}
        </nav>
        <p className="sr-only">Current page: {pathname}</p>
      </div>
    </div>
  )
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Close on navigation, so a tapped link never leaves a panel hanging over
  // the page it just opened.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        {/* h-16 = 64px, and it is the whole header: one row, no second strip. */}
        <div className="flex h-16 items-center gap-4">
          <Link to="/" className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-mono text-sm font-semibold tracking-tight text-ink">
              {SITE.name}
            </span>
          </Link>

          <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
            {USE_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden md:block">
            <AuthArea />
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white text-ink md:hidden"
          >
            <span aria-hidden="true" className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
                  menuOpen ? 'top-1.5 rotate-45' : 'top-0.5'
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-current transition-opacity ${
                  menuOpen ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
                  menuOpen ? 'top-1.5 -rotate-45' : 'top-2.5'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
