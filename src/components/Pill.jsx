const TONES = {
  good: 'bg-good-soft text-good border-good/25',
  mixed: 'bg-mixed-soft text-mixed border-mixed/25',
  bad: 'bg-bad-soft text-bad border-bad/25',
  unknown: 'bg-unknown-soft text-unknown border-unknown/30 border-dashed',
  accent: 'bg-accent-soft text-accent-ink border-accent/25',
  neutral: 'bg-white text-ink-soft border-line',
}

export default function Pill({ tone = 'neutral', children, title, className = '' }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
