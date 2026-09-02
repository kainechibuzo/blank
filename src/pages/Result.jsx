import { Link, useParams, useSearchParams } from 'react-router-dom'
import { categoryBySlug, phraseFor } from '../lib/categories.js'
import NotFound from './NotFound.jsx'

/**
 * Result — what actually happens to the thing you were about to paste.
 *
 * Consequence first. Not metrics, not a table, not a score: three groups, in
 * the order that matters to someone holding sensitive text — what is already
 * safe, what you can make safer, and what nobody will tell you.
 *
 * No score number appears on this screen and FactPair is never imported. See
 * the traceability check that enforces it.
 */
export default function Result() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const category = categoryBySlug(slug)

  if (!category) return <NotFound />

  const phrase = phraseFor(category, params.get('q'))

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between gap-4">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center text-sm text-ink-soft hover:text-ink"
        >
          <span aria-hidden="true" className="mr-1.5">
            ←
          </span>
          Back
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
          {category.label}
        </p>
      </div>

      <hr className="my-4 border-line" />

      <h1 className="text-balance font-serif text-3xl leading-tight text-ink sm:text-4xl">
        Typing {phrase} into these tools?
      </h1>
      <p className="mt-2 text-lg text-ink-soft">Here&rsquo;s what actually happens to it.</p>

      {/* The one thing this screen has to say before it says anything else.
          Without it, grouping tools "for medical info" implies the policies
          treat medical data differently, and they do not. */}
      <p className="mt-5 rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-ink-soft">
        {category.note}
      </p>
    </div>
  )
}
