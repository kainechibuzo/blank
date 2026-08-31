const TONES = {
  good: 'bg-good-soft text-good border-good/25',
  mixed: 'bg-mixed-soft text-mixed border-mixed/25',
  bad: 'bg-bad-soft text-bad border-bad/25',
  unknown: 'bg-unknown-soft text-unknown border-unknown/30 border-dashed',
  accent: 'bg-accent-soft text-accent-ink border-accent/25',
  neutral: 'bg-white text-ink-soft border-line',
}

/**
 * `muted` keeps the meaning (green still means good) but drops the confident
 * filled background, so an unverified row cannot read as a settled verdict.
 * Used on every draft row; verified rows keep the full-colour treatment.
 */
const MUTED_TONES = {
  good: 'bg-transparent text-good/75 border-good/30',
  mixed: 'bg-transparent text-mixed/75 border-mixed/30',
  bad: 'bg-transparent text-bad/75 border-bad/30',
  unknown: 'bg-transparent text-unknown border-unknown/30 border-dashed',
  accent: 'bg-transparent text-accent-ink/75 border-accent/30',
  neutral: 'bg-transparent text-ink-soft border-line',
}

export default function Pill({ tone = 'neutral', muted = false, children, title, className = '' }) {
  const palette = muted ? MUTED_TONES : TONES
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium whitespace-nowrap ${palette[tone] ?? palette.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
