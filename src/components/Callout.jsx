const VARIANTS = {
  note: 'border-line bg-white',
  warn: 'border-mixed/40 bg-mixed-soft hatch hatch-edge',
  rule: 'border-accent/30 bg-accent-soft',
  danger: 'border-bad/30 bg-bad-soft',
}

export default function Callout({ variant = 'note', title, children, className = '' }) {
  return (
    <div className={`rounded-lg border p-4 text-sm leading-relaxed ${VARIANTS[variant]} ${className}`}>
      {title && <p className="mb-1 font-semibold text-ink">{title}</p>}
      <div className="text-ink-soft [&_a]:underline [&_a]:underline-offset-2">{children}</div>
    </div>
  )
}
