/**
 * TrustStrip — three signals, one row, under the hero.
 *
 * Icon plus a short label and nothing else. Not a paragraph, not a section
 * header: a person deciding whether to trust this site does not read three
 * paragraphs of reassurance, they glance at three claims and move on. Anyone
 * who wants the detail finds it on the methodology page.
 *
 * These three are chosen because they are the three ways a site like this
 * normally betrays you — it did not read the policies, it took money to rank
 * them, or it watched you while you looked.
 */

const SIGNALS = [
  { icon: 'ⓘ', label: 'We read the actual policies' },
  { icon: 'ⓘ', label: 'No sponsored rankings' },
  { icon: 'ⓘ', label: 'No analytics on this site' },
]

export default function TrustStrip({ className = '' }) {
  return (
    <ul
      aria-label="Why you can trust this"
      className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-start ${className}`}
    >
      {SIGNALS.map((s) => (
        <li key={s.label} className="flex items-center gap-1.5 text-sm text-ink-soft">
          <span aria-hidden="true" className="text-ink-faint">
            {s.icon}
          </span>
          {s.label}
        </li>
      ))}
    </ul>
  )
}
