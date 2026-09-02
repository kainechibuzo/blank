import { FIELDS, FIELD_ORDER } from '../data/schema.js'
import { STATES, STATE_ORDER, stateForField, noRemedyCopy } from '../lib/field-states.js'
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
const LABEL = 'Does it learn from your chats?'

export default function DevStates() {
  const matrix = FIELD_ORDER.map((key) => ({
    key,
    options: Object.keys(FIELDS[key]?.options ?? {}),
  })).filter((f) => f.options.length)

  // A value that maps to undefined is a schema value we have not given a state
  // to. That is never allowed to be a silent gap, so the page says how many
  // there are rather than quietly rendering them as something else.
  const unmapped = []
  for (const { key, options } of matrix) {
    for (const value of options) {
      if (!STATES[stateForField(key, { value, source: SAMPLE_SOURCE })]) {
        unmapped.push(`${key}: ${value}`)
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <header>
        <Pill tone="neutral">not linked from the nav</Pill>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Component states</h1>
        <p className="mt-1 text-sm text-ink-soft">
          The two primitives every page composes from. Five live states, four colours, no red.
        </p>
      </header>

      {/* ── 1. every live state, as a user sees it ────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          FieldState — all five live states
        </h2>

        <FieldState
          state="SAFE_BY_DEFAULT"
          label={LABEL}
          source={SAMPLE_SOURCE}
          readOn={SAMPLE_DATE}
        >
          Claude does not use your chats to train its models unless you turn that on yourself.
        </FieldState>

        <FieldState
          state="OPT_OUT_EXISTS"
          label={LABEL}
          source={SAMPLE_SOURCE}
          readOn={SAMPLE_DATE}
        >
          OpenAI may use your chats to train its models unless you turn this off in Settings. Most
          people never do.
        </FieldState>

        <FieldState state="NO_REMEDY" label={LABEL} source={SAMPLE_SOURCE} readOn={SAMPLE_DATE}>
          This tool trains on your chats. There is no opt-out on this plan.
        </FieldState>

        <FieldState state="UNKNOWN" label={LABEL} source={SAMPLE_SOURCE} readOn={SAMPLE_DATE}>
          Their policy doesn&apos;t say. We read it — this is a gap in their policy, not in ours.
        </FieldState>

        <FieldState state="NOT_READ_YET" label={LABEL}>
          We haven&apos;t read this yet.
        </FieldState>
      </section>

      {/* ── 2. NO_REMEDY, with the exact copy each value carries ──────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-faint">
          FieldState — NO_REMEDY copy, one per value
        </h2>
        <p className="text-xs leading-relaxed text-ink-soft">
          These four sentences are fixed strings, not generated from the value name. A component
          may not paraphrase them: &ldquo;no deletion route exists&rdquo; is a softer claim than
          the one the policy supports.
        </p>

        {[
          ['trains_on_data', 'yes', 'Does it learn from your chats?'],
          ['human_review', 'yes', 'Can a person read your chats?'],
          ['retention', 'indefinite', 'How long does it keep your data?'],
          ['deletion', 'none', 'Can you delete everything?'],
        ].map(([key, value, label]) => (
          <FieldState
            key={`${key}:${value}`}
            fieldKey={key}
            field={{ value, source: SAMPLE_SOURCE, read_on: SAMPLE_DATE }}
            label={label}
          />
        ))}
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
                          <strong className="text-noremedy">NO STATE — unmapped</strong>
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
          </div>
        ) : (
          <p className="text-xs text-good">
            Every value in the schema maps to a state. Nothing falls through.
          </p>
        )}
      </section>
    </div>
  )
}

function toneText(tone) {
  return tone === 'good'
    ? 'text-good'
    : tone === 'mixed'
      ? 'text-mixed'
      : tone === 'noremedy'
        ? 'text-noremedy'
        : 'text-unknown'
}
