import { useState } from 'react'
import { useIsPhone } from '../lib/useMediaQuery.js'

/**
 * Collapsible — a disclosure box, used to keep phone screens short.
 *
 * Behaviour, deliberately:
 *  - collapsed by default on phones, plain (always open) on larger screens,
 *    unless `collapseOnDesktop` is set;
 *  - content is unmounted while closed, so a phone page is genuinely smaller
 *    rather than just visually shorter;
 *  - the toggle row is a real button with aria-expanded, and the tap target is
 *    44px.
 *
 * It renders as a plain wrapper until the media query resolves, so the server
 * render and the first client render agree.
 */
export default function Collapsible({
  title,
  count = 0,
  countLabel = '',
  hint,
  defaultOpen = false,
  collapseOnDesktop = false,
  className = '',
  contentClassName = '',
  titleClassName = 'text-sm font-semibold text-ink',
  children,
}) {
  const isPhone = useIsPhone()
  const enabled = collapseOnDesktop || isPhone

  // null means "the reader has not touched it yet". Until they do, phones start
  // closed and desktop starts at defaultOpen — so one component gives phones
  // their compact view without collapsing anything for everyone else.
  const [touched, setTouched] = useState(null)
  const open = touched ?? (!isPhone && defaultOpen)

  if (!enabled) return <div className={className}>{children}</div>

  return (
    <div className={`overflow-hidden rounded-lg border border-line bg-white ${className}`}>
      {/* The toggle is wrapped in a heading so folding a section does not cost
          the page its document outline. */}
      <h2 className="m-0">
      <button
        type="button"
        onClick={() => setTouched(!open)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-paper"
      >
        <svg
          className={`h-3 w-3 shrink-0 text-ink-faint transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 10 10"
          aria-hidden="true"
        >
          <path d="M3 1l5 4-5 4z" fill="currentColor" />
        </svg>
        <span className={`flex-1 ${titleClassName}`}>{title}</span>
        {count > 0 && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] text-accent-ink">
            {count}
            {countLabel}
          </span>
        )}
      </button>
      </h2>

      {open && (
        <div className={`border-t border-line px-4 py-3 ${contentClassName}`}>
          {hint && <p className="mb-3 text-[11px] leading-snug text-ink-faint">{hint}</p>}
          {children}
        </div>
      )}
    </div>
  )
}
