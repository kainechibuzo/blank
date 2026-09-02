import { useEffect, useRef } from 'react'
import FilterRail from './FilterRail.jsx'

/**
 * FilterSheet — the mobile filter rail, as a bottom sheet.
 *
 * CONSTRAINT 4: a bottom sheet, not a sidebar. A sidebar on a phone is either
 * unusably narrow or pushes the results off screen, and both make filtering
 * feel like leaving the page.
 *
 * One button: "Show [n] results". Not "Apply" — the filters already applied the
 * moment they were toggled, so a button labelled Apply would be asking the user
 * to confirm something that has already happened. Not a close button either,
 * because the button's job is to tell you what you are about to see. The count
 * updates live as filters are toggled, so the number is the answer to "what am
 * I getting" before you dismiss the sheet.
 */
export default function FilterSheet({ open, onClose, active, onToggle, onReset, resultCount }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // Focus the panel, or Escape and Tab act on the page behind it.
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-ink/30"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        /* Capped and scrollable: a sheet taller than the viewport hides the one
           button that dismisses it. */
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-paper p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />

        <FilterRail
          active={active}
          onToggle={onToggle}
          onReset={onReset}
          idPrefix="sheet"
        />

        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-md bg-ink px-4 text-sm font-medium text-white hover:bg-ink-soft"
        >
          Show {resultCount} result{resultCount === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  )
}
