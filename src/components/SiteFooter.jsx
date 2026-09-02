import { Link } from 'react-router-dom'
import { datasetSummary } from '../lib/dataset-summary.js'
import { FIELD_ORDER } from '../data/schema.js'
import { formatDate } from '../lib/format.js'

/**
 * SiteFooter — one line, because the footer is where the claims live now.
 *
 *   "20 major AI tools · 8 facts each · read from their own policies ·
 *    last batch read [date] · not legal advice · methodology"
 *
 * This is also where the honest count lives: how many of the twenty rows have
 * actually been read. The old header bar used to carry that permanently and
 * non-dismissibly; the Phase 2 bar is dismissible, so moving the number here
 * is what keeps the dismissal from becoming a way to hide it.
 */

export default function SiteFooter() {
  const { toolCount, rowsRead, lastReadOn } = datasetSummary()

  return (
    <footer className="mt-10 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="text-xs leading-relaxed text-ink-faint">
          {toolCount} major AI tools · {FIELD_ORDER.length} facts each · read from their own policies ·{' '}
          {rowsRead < toolCount ? `${rowsRead} of ${toolCount} rows read so far · ` : ''}
          last batch read {lastReadOn ? formatDate(lastReadOn) : 'not yet'} · not legal advice ·{' '}
          <Link to="/methodology" className="underline underline-offset-2 hover:text-ink">
            methodology
          </Link>
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          No analytics · no trackers · no ad pixels · we paraphrase policy text, we never quote it
        </p>
      </div>
    </footer>
  )
}
