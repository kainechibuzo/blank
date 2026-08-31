import { VERIFICATION_STATUSES } from '../data/schema.js'
import { freshness } from '../lib/watchlist.js'
import Pill from './Pill.jsx'

export default function VerificationBadge({ tool, showAge = true }) {
  const status = VERIFICATION_STATUSES[tool.verification.status] ?? VERIFICATION_STATUSES['draft-unverified']
  const age = freshness(tool)

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Pill tone={status.tone} title={status.blurb}>
        {status.label}
      </Pill>
      {showAge && (
        <Pill tone={age.tone} title={age.days === null ? 'No human has confirmed this row yet.' : `Last confirmed ${age.days} days ago.`}>
          {age.days === null ? 'Last verified: never' : `Last verified: ${age.label}`}
        </Pill>
      )}
    </span>
  )
}
