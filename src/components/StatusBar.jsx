import { useState } from 'react'
import { datasetSummary } from '../lib/dataset-summary.js'

/**
 * StatusBar — a thin, dismissible line that says the data is not finished.
 *
 * CONSTRAINT 5: localStorage only. No cookie, no session storage, no API call.
 * Clear your storage and it comes back — which is correct, because this is a
 * warning rather than a preference. A preference you set once and forget; a
 * warning you should be told again if we lose track of having told you.
 *
 * It is also not a permanent fixture. Once every row has been read at least
 * once the component renders nothing at all, so it removes itself instead of
 * waiting for somebody to remember to delete it.
 */

const KEY = 'wt:status-bar-dismissed:v1'

export default function StatusBar() {
  const { allRowsRead } = datasetSummary()

  // Read synchronously rather than in an effect: an effect means the bar paints
  // and then vanishes for anyone who already dismissed it, which is a flash of
  // the exact thing they asked not to see. Guarded because this renders on the
  // server too, where localStorage does not exist.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(KEY) === '1'
    } catch {
      // Private browsing and blocked storage both throw here. The bar stays —
      // the safe direction for a warning.
      return false
    }
  })

  if (allRowsRead || dismissed) return null

  function dismiss() {
    setDismissed(true)
    try {
      window.localStorage.setItem(KEY, '1')
    } catch {
      // Nothing to do. The bar is hidden for this session and returns on the
      // next load, which is the honest outcome when we cannot record it.
    }
  }

  return (
    <div className="border-b border-line bg-line/20">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1.5">
        <p className="flex-1 text-center text-xs text-ink-soft sm:text-left">
          Pre-launch · draft data · not legal advice
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this notice"
          /* 44px touch target even though the glyph is 12px: a dismissal the
             thumb cannot hit is not a dismissal. */
          className="-mr-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-ink-faint hover:bg-line/40 hover:text-ink"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  )
}
