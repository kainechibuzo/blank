import { Link, useParams, useSearchParams } from 'react-router-dom'
import { TOOLS } from '../data/tools.js'
import { categoryBySlug, phraseFor } from '../lib/categories.js'
import { groupTools } from '../lib/consequence.js'
import ToolResultCard from '../components/ToolResultCard.jsx'
import ColourLegend from '../components/ColourLegend.jsx'
import NotFound from './NotFound.jsx'

/**
 * Result — what actually happens to the thing you were about to paste.
 *
 * Consequence first, metrics never. Tools are grouped by what happens to you,
 * in the order that matters: safe, fixable-if-you-act, no remedy, unclear, and
 * not read yet. Never alphabetical, never by score — a leaderboard answers a
 * question this screen is not asking.
 *
 * No score number appears here and FactPair is never imported. See the
 * traceability check that enforces it.
 */
export default function Result() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const category = categoryBySlug(slug)

  if (!category) return <NotFound />

  const phrase = phraseFor(category, params.get('q'))
  const { groups, unmapped } = groupTools(TOOLS, category)

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

      {/* Said once, at the top, before any grouping implies otherwise: the
          policies do not sort by what you type. The category chooses which
          facts lead, not what the answer is. */}
      <p className="mt-5 rounded-lg border border-line bg-white p-4 text-sm leading-relaxed text-ink-soft">
        {category.note}
      </p>

      {/* A value stateForField could not map is a bug in our schema, not a
          finding about a provider. It shouts here rather than being filed
          under a group, exactly as it does in FieldState. */}
      {unmapped.length > 0 ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border-2 border-dashed border-mixed/60 bg-mixed-soft p-3 text-sm text-mixed"
        >
          {unmapped.length} value{unmapped.length === 1 ? '' : 's'} we cannot classify:{' '}
          {unmapped.join(', ')}. These are not shown as &ldquo;unknown&rdquo; — that would blame a
          provider for a gap in our own schema.
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
        {groups.map((group) =>
          group.tools.length === 0 ? null : (
            <section key={group.id} aria-labelledby={`group-${group.id}`}>
              <h2 id={`group-${group.id}`} className="font-serif text-xl text-ink">
                {group.heading}
              </h2>
              <p className="mt-1 text-sm text-ink-faint">{group.sub}</p>

              {/* The unread group collapses. It is fourteen rows today and it
                  would otherwise be most of the screen, but it stays visible
                  as a count rather than being dropped — the number of rows we
                  have not read is a fact about us that belongs on the page. */}
              {group.id === 'unread' ? (
                <details className="mt-3">
                  <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-sm text-ink-soft hover:text-ink">
                    {group.tools.length} more tool{group.tools.length === 1 ? '' : 's'} — show them
                  </summary>
                  <div className="mt-3 space-y-3">
                    {group.tools.map(({ tool, sentence, state, offByDefault }) => (
                      <ToolResultCard
                        key={tool.id}
                        tool={tool}
                        sentence={sentence}
                        state={state}
                        offByDefault={offByDefault}
                        href={`/tools/${tool.id}`}
                      />
                    ))}
                  </div>
                </details>
              ) : (
                <div className="mt-3 space-y-3">
                  {group.tools.map(({ tool, sentence, state, offByDefault }) => (
                    <ToolResultCard
                      key={tool.id}
                      tool={tool}
                      sentence={sentence}
                      state={state}
                      offByDefault={offByDefault}
                      href={`/tools/${tool.id}`}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        )}
      </div>

      <ColourLegend />
    </div>
  )
}
