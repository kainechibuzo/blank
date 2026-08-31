import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { SITE } from '../data/schema.js'
import { DATASET_META as META } from '../data/tools.js'
import { useAuth } from '../lib/auth.jsx'

/**
 * Navigation is split into "use the site" and "how it is governed" because a
 * first-time visitor needs to find the comparison, and a sceptical one needs to
 * find the rule that says money cannot touch it. Mixing them into one row made
 * both harder to find.
 *
 * Hints live in the mobile menu and the landing page — the desktop row stays
 * short enough not to wrap.
 */
const USE_NAV = [
  { to: '/compare', label: 'Compare', hint: 'Filter every tool by the policies' },
  { to: '/discover', label: 'Discover', hint: 'Describe what you need in plain words', chip: 'preview' },
  { to: '/directory', label: 'Directory', hint: 'Community submissions, ownership verified' },
]

const RULES_NAV = [
  { to: '/methodology', label: 'Methodology', hint: 'The eight fields and how each is scored' },
  { to: '/charter', label: 'The one rule', hint: 'What money can never influence' },
  { to: '/sponsors', label: 'Sponsors', hint: 'The only page funding may touch', muted: true },
]

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function linkClass({ isActive, muted }) {
  return [
    'inline-flex items-center gap-1.5 rounded px-1 py-1.5 text-sm underline-offset-4 transition-colors',
    isActive
      ? 'font-medium text-ink underline decoration-2 decoration-accent'
      : muted
        ? 'text-ink-faint hover:text-ink-soft'
        : 'text-ink-soft hover:text-ink',
  ].join(' ')
}

function NavItem({ item, withHint = false }) {
  return (
    <NavLink to={item.to} className={(s) => linkClass({ ...s, muted: item.muted })}>
      {item.label}
      {item.chip && (
        <span className="rounded border border-line px-1 font-mono text-[10px] text-ink-faint">{item.chip}</span>
      )}
      {withHint && item.hint && <span className="ml-1 text-xs text-ink-faint">— {item.hint}</span>}
    </NavLink>
  )
}

/** Desktop: a tiny group label keeps "use" and "rules" visually separate. */
function NavGroup({ label, items, className = '' }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint/80">{label}</span>
      {items.map((item) => (
        <NavItem key={item.to} item={item} />
      ))}
    </div>
  )
}

function SignInButton({ className = '' }) {
  return (
    <Link
      to="/account"
      className={`inline-flex min-h-[38px] items-center justify-center rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink hover:border-ink-faint ${className}`}
    >
      Sign in
    </Link>
  )
}

function AuthArea() {
  const { user, loading, configured, signOut } = useAuth()

  if (loading) return <div className="h-[38px] w-24 animate-pulse rounded-md bg-line/40" aria-hidden="true" />

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <SignInButton />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/account"
        title={configured ? user.email : 'Supabase is not configured'}
        className="inline-flex min-h-[38px] max-w-[11rem] items-center truncate rounded-md px-2 py-2 text-sm text-ink-soft hover:text-ink"
      >
        <span className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent-ink">
          {user.email?.slice(0, 1).toUpperCase() ?? '?'}
        </span>
        <span className="truncate">{user.email}</span>
      </Link>
      <button
        type="button"
        onClick={() => signOut()}
        className="inline-flex min-h-[38px] items-center rounded-md px-2 py-2 text-sm text-ink-faint hover:text-ink"
      >
        Sign out
      </button>
    </div>
  )
}

function MobileMenu({ open, onClose }) {
  const { user, signOut } = useAuth()
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div ref={panelRef} className="border-t border-line bg-paper md:hidden">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">Use the site</p>
          <nav className="mt-1 flex flex-col">
            {USE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-[44px] flex-col justify-center border-b border-line/60 py-2 ${isActive ? 'text-ink' : 'text-ink-soft'}`
                }
              >
                <span className="text-[15px] font-medium">
                  {item.label}
                  {item.chip && (
                    <span className="ml-1.5 rounded border border-line px-1 font-mono text-[10px] font-normal text-ink-faint">
                      {item.chip}
                    </span>
                  )}
                </span>
                <span className="text-xs text-ink-faint">{item.hint}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">How it is governed</p>
          <nav className="mt-1 flex flex-col">
            {RULES_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-[44px] flex-col justify-center border-b border-line/60 py-2 ${isActive ? 'text-ink' : 'text-ink-soft'}`
                }
              >
                <span className="text-[15px] font-medium">{item.label}</span>
                <span className="text-xs text-ink-faint">{item.hint}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2">
          {user ? (
            <>
              <Link
                to="/account"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink"
              >
                {user.email}
              </Link>
              <button
                type="button"
                onClick={() => {
                  signOut()
                  onClose()
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-md px-4 py-2.5 text-sm text-ink-soft"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/account"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-white"
              >
                Sign in
              </Link>
              <Link
                to="/account"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink"
              >
                Create an account
              </Link>
              <p className="text-xs text-ink-faint">
                You never need an account to read anything. Accounts exist only to submit a tool and,
                later, to vote — and they never touch the comparison.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the menu whenever the route changes, so a tapped link never leaves a
  // panel hanging over the page it just opened.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScrollTop />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      {/* Permanent, non-dismissible. Anyone who lands on any page learns the
          state of the data before they read a single number. */}
      <div className="hatch border-b border-mixed/30 bg-mixed-soft">
        <div className="mx-auto max-w-6xl px-4 py-2 text-center text-xs leading-relaxed text-mixed">
          <strong className="font-semibold">Draft dataset.</strong> All {META.tool_count} rows are
          unverified — {META.verified_count} confirmed by a human. Nothing here is citable yet.{' '}
          <Link to="/methodology" className="underline underline-offset-2">
            How verification works
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center gap-3 py-2.5">
            <Link to="/" className="flex min-w-0 items-baseline gap-2" onClick={() => setMenuOpen(false)}>
              <span className="truncate font-mono text-sm font-semibold tracking-tight text-ink">
                {SITE.name}
              </span>
              <span className="hidden truncate text-xs text-ink-faint lg:inline">{SITE.tagline}</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:block">
                <AuthArea />
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink md:hidden"
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

          {/* Desktop only: short row, two groups, no wrapping. */}
          <div className="hidden items-center gap-8 pb-2 md:flex">
            <NavGroup label="Use" items={USE_NAV} />
            <NavGroup label="Governed by" items={RULES_NAV} className="ml-auto" />
          </div>
        </div>

        <div id="mobile-menu">
          <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="mt-8 border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <p className="font-mono text-sm font-semibold text-ink">{SITE.name}</p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-ink-soft">{SITE.tagline}</p>
              <p className="mt-3 max-w-sm rounded-md border-l-2 border-accent bg-accent-soft/50 px-3 py-2 text-xs leading-relaxed text-ink-soft">
                <strong className="text-ink">The one rule:</strong> money can fund a clearly separate
                page. It can never touch which tools get evaluated, how a clause is summarised, or any
                ranking, badge or boost inside the real comparison.{' '}
                <Link to="/charter" className="text-accent underline underline-offset-2">
                  Read it in full
                </Link>
                .
              </p>
            </div>

            <FooterColumn
              title="Use the site"
              links={[
                ...USE_NAV.map((i) => ({ to: i.to, label: i.label })),
                { to: '/tools/chatgpt', label: 'Example tool page' },
              ]}
            />
            <FooterColumn
              title="How it works"
              links={[
                ...RULES_NAV.map((i) => ({ to: i.to, label: i.label })),
                { to: '/account', label: 'Account' },
              ]}
            />
          </div>

          <p className="mt-8 border-t border-line pt-4 text-xs text-ink-faint">
            {SITE.phase} · {META.scope} · No analytics, no trackers, no ad pixels. Paraphrase only —
            this site quotes no policy text verbatim. Not legal advice.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FooterColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-ink-soft hover:text-ink hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
