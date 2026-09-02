import { FIELDS, FIELD_ORDER } from '../data/schema.js'
import { STATES, STATE_ORDER, NEEDS_DECISION, stateForField } from '../lib/field-states.js'
import FieldState from '../components/FieldState.jsx'
import FactPair from '../components/FactPair.jsx'
import Pill from '../components/Pill.jsx'

/**
 * DevStates — the sheet every later phase is built against.
 *
 * Not linked from the navigation: it exists so the two primitives can be
 * signed off in isolation, and so any value that has no state is visible
 * rather than discovered later as a grey box on a live page.
 *
 * Route: /dev/states
 */

const SAMPLE_SOURCE = 'https://openai.com/policies/privacy-policy/'
const SAMPLE_DATE = '2026-09-02'

export default function DevStates() {
  const matrix = FIELD_ORDER.map((key) => ({
    key,
    options: Object.keys(FIELDS[key]?.options ?? {}),
  })).filter((f) => f.options.length)

  const unmapped = []
  for (const { key, options } of matrix) {
    for (const value of options) {
      const state = stateForField(key, { value, source: SAMPLE_SOURCE })
      if (state === NEEDS_DECISION) unmapped.push(`${key}: ${value}`)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <header>
        <Pill tone="neutral">not linked from the nav</Pill>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Component states</h1>
        <p className="mt-1 text-sm text-ink-soft">
          The two primitives every page composes from. Sign these off before any page is rebuilt.
        </p>
      </header>

      {/* ── 1. every state, as a user sees it ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          FieldState — all five
        </h2>

        <FieldState
          state="SAFE_BY_DEFAULT"
          label="Does it learn from your chats?"
          source={SAMPLE_SOURCE}
          readOn={SAMPLE_DATE}
        >
          Claude does not use your chats to train its models unless you turn that on yourself.
        </FieldState>

        <FieldState
          state="OPT_OUT_EXISTS"
          label="Does it learn from your chats?"
          source={SAMPLE_SOURCE}
          readOn={SAMPLE_DATE}
        >
          OpenAI may use your chats to train its models unless you turn this off in Settings. Most
          people never do.
        </FieldState>

        <FieldState
          state="UNKNOWN"
          label="Does it learn from your chats?"
          source={SAMPLE_SOURCE}
          readOn={SAMPLE_DATE}
        >
          Their policy doesn&apos;t say. We read it — this is a gap in their policy, not in ours.
        </FieldState>

        <FieldState state="NOT_READ_YET" label="Does it learn from your chats?">
          We haven&apos;t read this yet.
        </FieldState>

        <FieldState
          state="STALE"
          label="Does it learn from your chats?"
          source={SAMPLE_SOURCE}
          readOn="2026-06-01"
        >
          This may be outdated — checking.
        </FieldState>
      </section>

      {/* ── 2. the gap, stated where it cannot be ignored ─────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          FieldState — a value with no state yet
        </h2>
        <FieldState
          state={NEEDS_DECISION}
          label="Can a person read your chats?"
          source={SAMPLE_SOURCE}
          readOn={SAMPLE_DATE}
        >
          Google states that human reviewers help protect their services, even when activity
          saving is off.
        </FieldState>
        <p className="text-xs leading-relaxed text-ink-soft">
          This is what a fact renders as when the value is real, unwelcome, and fits none of the
          five states. It is not grey — grey would call it unknowable, and it is not. It is not
          yellow — yellow would imply an opt-out that does not exist. It needs a decision.
        </p>
      </section>

      {/* ── 3. FactPair across the coverage threshold ─────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          FactPair — above and below 70% coverage
        </h2>
        <div className="flex flex-wrap gap-3">
          <FactPair score={76} coverage={100} fraction="6/7" />
          <FactPair score={59} coverage={100} fraction="7/7" />
          <FactPair score={59} coverage={86} fraction="6/7" />
          <FactPair score={44} coverage={57} fraction="4/7" />
          <FactPair score={16} coverage={43} fraction="4/7" />
        </div>
        <p className="text-xs leading-relaxed text-ink-soft">
          The last three sit under 70% coverage, so the score is an outline rather than a solid
          figure. Same number, visibly less settled.
        </p>
      </section>

      {/* ── 4. every value, mapped ───────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          Every value, and the state it maps to
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line text-ink-faint">
                <th className="py-2 pr-3 font-medium">field</th>
                <th className="py-2 pr-3 font-medium">value</th>
                <th className="py-2 font-medium">state</th>
              </tr>
            </thead>
            <tbody>
              {matrix.flatMap(({ key, options }) =>
                options.map((value) => {
                  const state = stateForField(key, { value, source: SAMPLE_SOURCE })
                  const meta = STATES[state]
                  return (
                    <tr key={`${key}:${value}`} className="border-b border-line/60">
                      <td className="py-1.5 pr-3 font-mono text-ink-faint">{key}</td>
                      <td className="py-1.5 pr-3 font-mono">{value}</td>
                      <td className="py-1.5">
                        {meta ? (
                          <span className={toneText(meta.tone)}>
                            {meta.icon} {state}
                          </span>
                        ) : (
                          <strong className="text-mixed">{state}</strong>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {unmapped.length > 0 ? (
          <div className="rounded-lg border-2 border-dashed border-mixed/60 bg-mixed-soft p-3">
            <p className="text-xs font-medium text-mixed">
              {unmapped.length} value{unmapped.length === 1 ? '' : 's'} have no state:{' '}
              {unmapped.join(', ')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              These are the &ldquo;bad, and nothing you can do about it&rdquo; answers. The
              three-colour system has no slot for them. They are not rendered as unknown, because
              they are known.
            </p>
          </div>
        ) : (
          <p className="text-xs text-good">Every value maps to a state.</p>
        )}
      </section>
    </div>
  )
}

function toneText(tone) {
  return tone === 'good' ? 'text-good' : tone === 'mixed' ? 'text-mixed' : 'text-unknown'
}
