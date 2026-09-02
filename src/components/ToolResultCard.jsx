import { Link } from 'react-router-dom'
import { OFF_BY_DEFAULT_PHRASE } from '../lib/plain-english.js'
import { STATES } from '../lib/field-states.js'

/**
 * ToolResultCard — one tool, one sentence, one thing to do about it.
 *
 * No score on this card. The FactPair component is not imported here and must
 * never be: this screen is for someone who wants to know whether it is safe to
 * paste something, not how it placed.
 *
 * The sentence is category-aware in the only sense the data supports — it is
 * the sentence for whichever fact actually decided the group, which is the
 * fact that matters for the thing they said they were going to paste.
 */

const TONE = {
  good: 'border-good/30',
  mixed: 'border-mixed/30',
  noremedy: 'border-noremedy/30',
  unknown: 'border-unknown/30',
}

export default function ToolResultCard({ tool, sentence, state, offByDefault, href }) {
  const meta = STATES[state] ?? STATES.NOT_READ_YET

  return (
    <article className={`rounded-xl border bg-white p-4 ${TONE[meta.tone] ?? TONE.unknown}`}>
      <div className="flex items-start gap-3">
        {/* No logo files in the dataset, so the monogram stands in. It is not
            a decorative initial — it is the only visual identity we hold for
            these tools, and inventing badges would imply partnerships. */}
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-paper font-mono text-xs font-semibold text-ink-soft"
        >
          {tool.monogram ?? tool.name?.slice(0, 2)}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink">
            <Link to={href} className="hover:underline">
              {tool.name}
            </Link>
          </h3>

          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {/* aria-hidden on the glyph: the sentence beside it already says
                the thing, and meaning never rests on a glyph alone. */}
            <span aria-hidden="true" className="mr-1.5">
              {meta.icon}
            </span>
            {sentence}
            {/* The condition, not a hardcoded string. Rendered only when a
                safer setting exists and is off by default, and only for the
                two fields where that is both true and worth saying. */}
            {offByDefault ? (
              <>
                {' '}
                <strong className="font-semibold text-ink">{OFF_BY_DEFAULT_PHRASE}</strong>
              </>
            ) : null}
          </p>

          <div className="mt-3">
            {/* "How to opt out" only when there is a switch to flip. Offering
                it on a fact with no opt-out sends someone to a settings screen
                that does not have the thing we just told them to look for. */}
            {offByDefault ? (
              <Link
                to={href}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-accent hover:underline"
              >
                How to opt out →
              </Link>
            ) : (
              <Link
                to={href}
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-ink-soft hover:text-ink hover:underline"
              >
                Full breakdown →
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
