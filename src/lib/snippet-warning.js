/**
 * snippet-warning.js — the warning a listing owner receives when a weekly check
 * cannot find their snippet, or finds an altered one.
 *
 * Four parts, from the roadmap, and all four must be present or the message is
 * not fit to send:
 *   1. what changed (a commit-history-style log)
 *   2. what happens next (a human reviews — nothing is automatic)
 *   3. what removal would mean, if the review finds tampering
 *   4. how to contact support, with a real route
 *
 * A traceability check asserts all four survive, so this cannot quietly be
 * trimmed down to a threatening one-liner later.
 */

export const WARNING_PARTS = [
  { key: 'what_changed', heading: 'What changed' },
  { key: 'what_next', heading: 'What happens next' },
  { key: 'what_removal_means', heading: 'What removal would mean' },
  { key: 'how_to_contact', heading: 'How to contact support' },
]

/**
 * @param {object} o
 * @param {string} o.listingName
 * @param {Array<{checked_at:string, outcome:string, note:string, httpStatus?:number|null}>} o.checks
 *        newest first — this is the log.
 * @param {string} o.supportEmail
 */
export function buildWarning({ listingName, checks = [], supportEmail = 'support@example.org' }) {
  const log =
    checks.length === 0
      ? '  (no previous checks recorded)'
      : checks
          .map((c) => {
            const when = c.checked_at ? new Date(c.checked_at).toISOString().replace('T', ' ').slice(0, 16) : 'unknown time'
            const status = c.httpStatus ? `HTTP ${c.httpStatus}` : 'no response'
            return `  ${when} UTC  ${c.outcome.padEnd(11)} ${status}  ${c.note ?? ''}`
          })
          .join('\n')

  const parts = {
    what_changed: [
      `The weekly check could not confirm the verification tag on "${listingName}".`,
      '',
      'Recent checks, newest first:',
      log,
    ].join('\n'),

    what_next: [
      'A human reviews this before anything happens to your listing. Nothing is',
      'automatic and nothing is removed by the bot.',
      '',
      'The usual cause is innocent — a site redesign, a CMS migration, a caching',
      'layer that strips <head> tags, or someone tidying the header. If that is what',
      'happened, re-add the tag and reply to this message; no further action is needed.',
    ].join('\n'),

    what_removal_means: [
      'If the review finds the tag was deliberately altered to misrepresent who',
      'controls the site, the listing will be delisted and the reason will be',
      'recorded publicly on the listing page. Delisting is a founder decision, made',
      'by hand, never by the bot.',
    ].join('\n'),

    how_to_contact: [
      `Reply to this message or email ${supportEmail}.`,
      'You will get a response within five working days, and a decision either way.',
      'If you believe the check is wrong, say so — false positives are expected and',
      'we would rather hear about them.',
    ].join('\n'),
  }

  return {
    subject: `Action needed: verification tag not found on "${listingName}"`,
    parts,
    text: [
      parts.what_changed,
      '',
      `What happens next`,
      parts.what_next,
      '',
      `What removal would mean`,
      parts.what_removal_means,
      '',
      `How to contact support`,
      parts.how_to_contact,
    ].join('\n'),
  }
}

/** Used by the traceability check: every part must be non-empty. */
export function warningPartsPresent(warning) {
  return WARNING_PARTS.every((p) => typeof warning?.parts?.[p.key] === 'string' && warning.parts[p.key].trim().length > 0)
}
