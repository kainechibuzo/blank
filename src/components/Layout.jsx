import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { SITE } from '../data/schema.js'
import { DATASET_META as META } from '../data/tools.js'

const NAV = [
  { to: '/compare', label: 'Compare' },
  { to: '/discover', label: 'Discover', chip: 'Phase 3' },
  { to: '/directory', label: 'Directory' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/charter', label: 'The one rule' },
  { to: '/account', label: 'Account' },
  { to: '/sponsors', label: 'Sponsors', muted: true },
]

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ScrollTop />

      {/* Permanent, non-dismissible. Anyone who lands on any page learns the
          state of the data before they read a single number. */}
      <div className="hatch border-b border-mixed/30 bg-mixed-soft">
        <div className="mx-auto max-w-6xl px-4 py-2 text-center text-xs text-mixed">
          <strong className="font-semibold">Draft dataset.</strong> All {META.tool_count} rows are
          unverified — {META.verified_count} confirmed by a human. Nothing here is citable yet.{' '}
          <Link to="/methodology" className="underline underline-offset-2">
            How verification works
          </Link>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-mono text-sm font-semibold tracking-tight text-ink">{SITE.name}</span>
            <span className="hidden text-xs text-ink-faint sm:inline">{SITE.tagline}</span>
          </Link>

          <nav className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative py-1 ${
                    isActive ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
                  } ${item.muted ? 'text-ink-faint' : ''}`
                }
              >
                {item.label}
                {item.chip && (
                  <span className="ml-1 rounded border border-line px-1 font-mono text-[10px] text-ink-faint">
                    {item.chip}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 text-xs text-ink-faint">
          <p className="max-w-2xl text-ink-soft">
            <strong className="text-ink">The one rule:</strong> money can fund a clearly separate
            page. It can never touch which tools get evaluated, how a clause is summarised, or any
            ranking, badge or boost inside the real comparison.{' '}
            <Link to="/charter" className="text-accent underline underline-offset-2">
              Read it in full
            </Link>
            .
          </p>
          <p>
            {SITE.name} · {SITE.phase} · {META.scope} · No analytics, no trackers, no ad
            pixels. Paraphrase only — this site quotes no policy text verbatim. Not legal advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
