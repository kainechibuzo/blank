import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import SiteHeader from './SiteHeader.jsx'
import StatusBar from './StatusBar.jsx'
import SiteFooter from './SiteFooter.jsx'

/**
 * Layout — the shell, and nothing else.
 *
 * Header, status bar, main, footer. Every piece of chrome now lives in its own
 * component so a change to the header cannot quietly alter the footer.
 */

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

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <StatusBar />
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
