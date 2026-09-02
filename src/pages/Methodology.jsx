import { Link } from 'react-router-dom'
import { FIELDS, FIELD_ORDER, SITE } from '../data/schema.js'
import { MAX, POINTS } from '../lib/scoring.js'
import { STATES, STATE_ORDER, stateForField } from '../lib/field-states.js'
import { plainLabel, wordForNumber } from '../lib/plain-labels.js'
import { datasetSummary } from '../lib/dataset-summary.js'
import { traceabilitySummary } from '../lib/traceability.js'

/**
 * Methodology — for people who want to check the working.
 *
 * Everything here is derived from the code that does the work, not written
 * beside it. The weights come from scoring.js, the field table from
 * FIELD_ORDER, the states from field-states.js. If any of those change, this
 * page changes with them, and a build check compares what this page renders
 * against the numbers in the source — so the one way this page can go stale is
 * if the check is removed, which is also a build failure.
 *
 * It is not in the main navigation. It is one tap away in the drawer, in every
 * page's footer, in the tool page's own footer, and behind the legend's
 * [What do these mean?] — because the person who needs it is the person who
 * has already read a claim and wants to know where it came from.
 */

/** The four statements. Nothing else in this section. */
const WHAT_THIS_IS = [
  'We read privacy policies so you don’t have to.',
  'We paraphrase. We do not quote verbatim.',
  'This is not legal advice.',
  'Scores describe policies, not product quality.',
]

export default function Methodology() {
  const trace = traceabilitySummary()
  const summary = datasetSummary()

  /* Weights, straight from the scorer. Sorted the way they are scored so the
     list reads in descending order of consequence. */
  const weights = FIELD_ORDER.map((key) => ({ key, max: MAX[key] })).sort((a, b) => b.max - a.max)
  const weightTotal = weights.reduce((n, w) => n + w.max, 0)

  /* For each field, which states its values can actually produce. Derived, so a
     new value added to the schema shows up here without anyone remembering to
     document it. */
  const statesByField = FIELD_ORDER.map((key) => {
    const options = FIELDS[key]?.options ?? {}
    const reached = new Set()
    for (const value of Object.keys(options)) {
      const mapped = stateForFieldFor(key, value)
      if (mapped) reached.add(mapped)
    }
    if (key === 'residency') {
      reached.add('SAFE_BY_DEFAULT')
      reached.add('UNKNOWN')
    }
    return { key, states: STATE_ORDER.filter((s) => reached.has(s)) }
  })

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header>
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Methodology</h1>
        <p className="mt-2 text-ink-soft">
          How the data is produced, what the numbers mean, and — most importantly — what they do not
          mean.
        </p>
      </header>

      {/* ── SECTION 1 ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">What this site does and does not do</h2>
        <ul className="mt-3 space-y-1.5">
          {WHAT_THIS_IS.map((line) => (
            <li key={line} className="text-[15px] leading-relaxed text-ink">
              {line}
            </li>
          ))}
        </ul>
      </section>

      {/* ── SECTION 2 ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">
          The {wordForNumber(FIELD_ORDER.length)} facts we track
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          This table is generated from the schema. Add a field and it appears here; remove one and it
          goes.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Field</th>
                <th className="px-4 py-2 font-medium">What we look for</th>
                <th className="px-4 py-2 font-medium">What each state means here</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {FIELD_ORDER.map((key) => {
                const field = FIELDS[key]
                const row = statesByField.find((s) => s.key === key)
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 align-top font-medium text-ink">
                      {plainLabel(key)}
                    </td>
                    <td className="px-4 py-3 align-top text-ink-soft">{field?.plain ?? '—'}</td>
                    <td className="px-4 py-3 align-top">
                      <ul className="space-y-1">
                        {(row?.states ?? []).map((state) => (
                          <li key={state} className="flex gap-1.5 text-ink-soft">
                            <span aria-hidden="true" className="text-unknown">
                              {STATES[state]?.icon}
                            </span>
                            <span>
                              <span className="text-ink">{STATES[state]?.label}</span>
                              {' — '}
                              {STATE_MEANING[key]?.[state] ?? STATES[state]?.blurb}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── SECTION 3 ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">How the score is calculated</h2>

        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Each field contributes a weight. The weights sum to {weightTotal}. A field we could not
          answer contributes nothing — it is not treated as bad, and it is not treated as good. It is
          simply missing, and coverage is what tells you how much is missing.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2 font-medium">Field</th>
                <th className="px-4 py-2 font-medium">Weight</th>
                <th className="px-4 py-2 font-medium">Points by answer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {weights.map(({ key, max }) => (
                <tr key={key}>
                  <td className="px-4 py-2.5 align-top font-medium text-ink">{plainLabel(key)}</td>
                  <td className="px-4 py-2.5 align-top font-mono text-xs text-ink-soft" data-weight={key}>
                    {max}
                  </td>
                  <td className="px-4 py-2.5 align-top text-xs text-ink-faint">
                    {POINTS[key] ? Object.entries(POINTS[key]).map(([v, p]) => `${v}: ${p}`).join(' · ') : 'scored from its structure — see below'}
                  </td>
                </tr>
              ))}
              <tr className="bg-paper-soft">
                <td className="px-4 py-2.5 font-medium text-ink">Total</td>
                <td className="px-4 py-2.5 font-mono text-xs text-ink" data-weight="total">
                  {weightTotal}
                </td>
                <td className="px-4 py-2.5 text-xs text-ink-faint" />
              </tr>
            </tbody>
          </table>
        </div>

        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-soft">
          <li>
            <strong className="text-ink">An UNKNOWN field scores its weight × 0.</strong> The policy
            was read and does not address the question. It is not credited as safe and not penalised
            as harmful — silence is not a finding.
          </li>
          <li>
            <strong className="text-ink">A NOT_READ_YET field is excluded from the denominator.</strong>{' '}
            It does not count against coverage, and it contributes no points. A row nobody has read
            scores 0 with 0% coverage and is shown as unread, never as bad.
          </li>
          <li>
            <strong className="text-ink">Residency has no fixed list of answers.</strong> It carries
            structure instead — a home jurisdiction and a set of regions — so it is scored by hand:
            an EU option earns the full {MAX.residency} points, a stated set of regions earns 4, and
            nothing earns 0.
          </li>
          <li>
            <strong className="text-ink">
              Coverage is (fields answered ÷ total fields) × 100.
            </strong>{' '}
            Answered means read <em>and</em> actually addressed by the page — a policy that is silent
            was read, but it did not answer.
          </li>
          <li>
            <strong className="text-ink">Score and coverage are always shown together.</strong>{' '}
            Neither is meaningful without the other. A score of 92 on 3 of {FIELD_ORDER.length}{' '}
            fields answered is a different claim from 92 on {FIELD_ORDER.length} of {FIELD_ORDER.length},
            and showing the number alone would collapse the two.
          </li>
        </ul>
      </section>

      {/* ── SECTION 4 ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">How we verify rows</h2>

        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Every fact on this site is in one of these states. A machine fetching a page is not a
          person reading it, and the two are never confused here: only a human reading the linked
          page on a recorded date can move a field out of NOT_READ_YET.
        </p>

        <ul className="mt-4 space-y-3">
          {STATE_ORDER.map((id) => (
            <li key={id} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-unknown">
                {STATES[id]?.icon}
              </span>
              <div>
                <p className="font-medium text-ink">{STATES[id]?.label}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{STATES[id]?.blurb}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-lg border border-line bg-paper-soft p-4">
          <h3 className="text-sm font-semibold text-ink">
            The difference between UNKNOWN and NOT_READ_YET
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            These look similar and are not. <strong className="text-ink">UNKNOWN</strong> means we
            read the policy and it does not say — that is a finding about the provider, and it is
            their gap, not ours. <strong className="text-ink">NOT_READ_YET</strong> means we have not
            looked — that is a finding about us. Rendering them the same would let an unread row
            borrow the credibility of a read one, which is exactly the thing this site exists not to
            do.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-line bg-paper-soft p-4">
          <h3 className="text-sm font-semibold text-ink">How the build guards work</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            The dataset is protected by a suite of checks that runs on every commit, and no check
            joins that suite until it has been shown to fail on a violation someone introduced by
            hand.{' '}
            <strong className="text-ink">
              Guards are tested to fail before they are trusted to pass. A check that cannot
              demonstrate failure is not a check.
            </strong>{' '}
            The suite currently runs {trace.passed} checks.
          </p>
        </div>
      </section>

      {/* ── SECTION 5 ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">The one rule</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          Money can fund a clearly separate sponsorship page. It cannot touch which tools are
          evaluated, how a clause is paraphrased, or any ranking, badge, or boost inside the real
          comparison.
        </p>
        <p className="mt-3">
          <Link to="/sponsors" className="text-sm font-medium text-accent hover:underline">
            The sponsors page →
          </Link>
        </p>
      </section>

      {/* ── SECTION 6 ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">The audit trail</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <a
              href={`${SITE.repo}/commits/main`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              The commit log is public →
            </a>{' '}
            <span className="text-ink-soft">
              every change to the dataset is a commit, and the history is never squashed.
            </span>
          </li>
          <li>
            <a
              href={`${SITE.repo}/blob/main/scripts/verified-rows.json`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              The readings file is public →
            </a>{' '}
            <span className="text-ink-soft">
              every confirmed value, with the page it was read from.
            </span>
          </li>
          <li>
            <a
              href={`${SITE.repo}/issues/new?title=${encodeURIComponent('Correction:')}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent hover:underline"
            >
              If you find an error, tell us →
            </a>{' '}
            <span className="text-ink-soft">
              it opens a public issue, so the correction becomes part of the record rather than an
              email nobody else can check.
            </span>
          </li>
        </ul>

        <p className="mt-4 text-xs text-ink-faint">
          {summary.toolCount} tools · {summary.rowsRead} read ·{' '}
          {summary.lastReadOn ? `last batch read ${summary.lastReadOn}` : 'last batch read: not yet'} ·
          not legal advice
        </p>
      </section>
    </div>
  )
}

/**
 * What a state means for one specific field. The generic blurb in field-states.js
 * is true everywhere but says little anywhere; this is the version a reader can
 * act on. Fields absent from this map fall back to the generic blurb.
 */
const STATE_MEANING = {
  trains_on_data: {
    SAFE_BY_DEFAULT: 'Your chats are not used to train the model.',
    OPT_OUT_EXISTS: 'They are used unless you turn it off yourself.',
    NO_REMEDY: 'They are used, and we found no setting that stops it.',
    UNKNOWN: 'The policy does not say whether chats are used for training.',
    NOT_READ_YET: 'Nobody has read this yet — no value is assumed.',
  },
  human_review: {
    SAFE_BY_DEFAULT: 'No person reads your conversations.',
    OPT_OUT_EXISTS: 'A person may read them in some situations, and nothing you can change alters that.',
    NO_REMEDY: 'A person may read them, and there is no opt-out on this plan.',
    UNKNOWN: 'The policy does not say whether people read conversations.',
    NOT_READ_YET: 'Nobody has read this yet — no value is assumed.',
  },
  retention: {
    SAFE_BY_DEFAULT: 'Data is deleted or de-identified quickly, and the period is stated.',
    OPT_OUT_EXISTS: 'A period is stated, and you can shorten it or delete sooner.',
    NO_REMEDY: 'They do not say when or whether they delete your data.',
    UNKNOWN: 'The policy states no retention period.',
    NOT_READ_YET: 'Nobody has read this yet — no value is assumed.',
  },
  deletion: {
    SAFE_BY_DEFAULT: 'You can delete your own data, yourself, in the product.',
    OPT_OUT_EXISTS: 'Deletion exists but takes a request, or covers only some data.',
    NO_REMEDY: 'You cannot delete your data on this plan.',
    UNKNOWN: 'The policy does not describe a deletion route.',
    NOT_READ_YET: 'Nobody has read this yet — no value is assumed.',
  },
  residency: {
    SAFE_BY_DEFAULT: 'You can choose to have your data processed in Europe.',
    UNKNOWN: 'The policy does not say where your data is processed.',
    NOT_READ_YET: 'Nobody has read this yet — no value is assumed.',
  },
  free_tier: {
    SAFE_BY_DEFAULT: 'The free plan follows the same policy as the paid ones.',
    OPT_OUT_EXISTS: 'The free plan differs — the rules you read above may not apply to it.',
    UNKNOWN: 'The policy does not say whether the free plan differs.',
    NOT_READ_YET: 'Nobody has read this yet — no value is assumed.',
  },
  enterprise_api: {
    SAFE_BY_DEFAULT: 'The business or API tier is covered by a separate, stricter policy.',
    OPT_OUT_EXISTS: 'The business tier is handled separately, but not strictly more safely.',
    UNKNOWN: 'The policy does not describe how the business or API tier differs.',
    NOT_READ_YET: 'Nobody has read this yet — no value is assumed.',
  },
}

/**
 * Which state a value would produce if it were read.
 *
 * stateForField needs a source, because an unread field is NOT_READ_YET
 * whatever its value says. This asks the other question — give the value a
 * stand-in source so the mapping can be shown — which is what the table in
 * section 2 is actually about: not what is on any row today, but what each
 * answer would mean if we found it.
 */
function stateForFieldFor(key, value) {
  return stateForField(key, { value, source: 'methodology-table' })
}
