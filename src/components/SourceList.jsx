import { freshness } from '../lib/watchlist.js'
import Pill from './Pill.jsx'

export default function SourceList({ sources = [], tool }) {
  if (!sources.length) {
    return <p className="text-sm text-ink-faint">No source pages recorded yet.</p>
  }

  const age = tool ? freshness(tool) : null

  return (
    <div>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.url} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              {s.label}
            </a>
            <span className="font-mono text-[11px] text-ink-faint">{new URL(s.url).hostname}</span>
            {s.last_hash ? (
              <Pill tone="neutral" title="Hash of the normalised page at last check">
                hash {s.last_hash}
              </Pill>
            ) : (
              <Pill tone="unknown" title="This page has not been fetched by the hash checker yet.">
                no hash yet
              </Pill>
            )}
          </li>
        ))}
      </ul>
      {age && age.days === null && (
        <p className="mt-2 text-xs text-ink-faint">
          These are the pages a reviewer must read. They have not been read. Links are provided as
          starting points, not as confirmation of anything.
        </p>
      )}
    </div>
  )
}
