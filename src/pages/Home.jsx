import TrustStrip from '../components/TrustStrip.jsx'
import TapTargets from '../components/TapTargets.jsx'

/**
 * Home — the entry point.
 *
 * One question. Not a table, not a score, not an explanation of methodology.
 *
 * The person this page is for googled "is ChatGPT safe" on their phone at
 * 11pm, and they have a specific thing in their clipboard. They do not want
 * to learn our taxonomy; they want to point at the thing they are about to
 * paste and be told what happens to it. Everything on this screen serves that
 * one exchange, and anything that does not is on another page.
 *
 * No score number appears here, and FactPair is never imported. See the
 * traceability check that enforces it.
 */

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="py-10 sm:py-16">
        <h1 className="text-balance font-serif text-4xl leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
          What are you about to type into an AI?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft sm:text-xl">
          Tap what fits. We&rsquo;ll tell you what actually happens to it.
        </p>

        <TapTargets className="mt-8" />

        <TrustStrip className="mt-8" />
      </section>
    </div>
  )
}
