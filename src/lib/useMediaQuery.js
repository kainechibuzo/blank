import { useEffect, useState } from 'react'

/**
 * useMediaQuery — SSR-safe.
 *
 * The initial state always matches the server render (ssrValue), and the real
 * value is applied in an effect after hydration. Reading matchMedia during the
 * first client render would produce markup that disagrees with the server's and
 * React would throw it away.
 */
export function useMediaQuery(query, ssrValue = false) {
  // Read it during the first render when there is a window. This is a
  // client-only single-page app, so there is no server markup to disagree with,
  // and reading it lazily means a phone never paints an expanded page for a
  // frame before folding it. In node (the render check) there is no window, so
  // it falls back to ssrValue.
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return ssrValue
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Phones only — below Tailwind's md breakpoint. */
export function useIsPhone() {
  return useMediaQuery('(max-width: 767px)')
}
