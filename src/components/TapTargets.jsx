import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../lib/categories.js'

/**
 * TapTargets — eight tappable cards, and not one control that looks like a
 * form.
 *
 * CONSTRAINT 3: not checkboxes, not a dropdown, not a list. Cards. Minimum
 * 48px tall (these are 56), single plain-English label, and no icons — an icon
 * on "Medical info" implies a taxonomy the person did not ask about and would
 * have to learn before they could answer the question.
 *
 * They are links, not buttons, so middle-click, long-press and keyboard all
 * behave the way the web has already taught people to expect.
 */

const OTHER = CATEGORIES.find((c) => c.slug === 'something-else')

export default function TapTargets({ className = '' }) {
  const [freeText, setFreeText] = useState('')
  const navigate = useNavigate()

  function submitOther(e) {
    e.preventDefault()
    const q = freeText.trim()
    navigate(q ? `/what/${OTHER.slug}?q=${encodeURIComponent(q)}` : `/what/${OTHER.slug}`)
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((cat) =>
          cat.slug === OTHER.slug ? (
            /* A button, because tapping it does not navigate — it reveals the
               box for whatever they actually had in mind. */
            <button
              key={cat.slug}
              type="button"
              onClick={() => document.getElementById('something-else-input')?.focus()}
              aria-expanded={false}
              aria-controls="something-else-input"
              className="flex min-h-[56px] items-center justify-center rounded-xl border border-dashed border-line-strong bg-white px-4 text-center text-[15px] font-medium text-ink-soft hover:border-ink-faint hover:text-ink"
            >
              {cat.label}
            </button>
          ) : (
            <Link
              key={cat.slug}
              to={`/what/${cat.slug}`}
              className="flex min-h-[56px] items-center justify-center rounded-xl border border-line bg-white px-4 text-center text-[15px] font-medium text-ink shadow-sm transition-colors hover:border-ink-faint hover:bg-paper"
            >
              {cat.label}
            </Link>
          )
        )}
      </div>

      <form onSubmit={submitOther} className="mt-3">
        <label htmlFor="something-else-input" className="sr-only">
          Describe what you are about to paste
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="something-else-input"
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Or describe it in your own words"
            /* 16px minimum: anything smaller makes iOS Safari zoom the page on
               focus, which on a form this short reads as the site breaking. */
            className="min-h-[48px] flex-1 rounded-xl border border-line bg-white px-4 text-base text-ink placeholder:text-ink-faint"
          />
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-ink px-5 text-base font-medium text-white hover:bg-ink-soft"
          >
            Go
          </button>
        </div>
      </form>
    </div>
  )
}
