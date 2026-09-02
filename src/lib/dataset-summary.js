import { TOOLS, DATASET_META } from '../data/tools.js'
import { FIELD_ORDER } from '../data/schema.js'

/**
 * dataset-summary.js — the three numbers the chrome is allowed to quote.
 *
 * One place, because the status bar and the footer both say how much of the
 * dataset has actually been read, and two places means two numbers that drift.
 * The moment they disagree, one of them is lying to a reader about how much of
 * this site is finished.
 */

/** Statuses that mean nobody has read the row. */
const NEVER_READ = ['draft-unverified', 'observed']

export function datasetSummary() {
  const rowsRead = TOOLS.filter((t) => !NEVER_READ.includes(t.verification?.status)).length

  // The newest date a field was actually read. Taken from the fields, not from
  // DATASET_META.last_updated, because a hand-maintained date is exactly the
  // kind of thing that goes stale in the way Phase 6 exists to catch.
  let lastReadOn = null
  for (const tool of TOOLS) {
    const on = toolLastReadOn(tool)
    if (on && (!lastReadOn || on > lastReadOn)) lastReadOn = on
  }

  return {
    toolCount: DATASET_META.tool_count,
    rowsRead,
    /* No fallback to DATASET_META.last_updated. That constant says 2026-08-31
       while the rows were read on 2026-09-02, and a hand-maintained date is
       exactly the trap this is meant to avoid. If no row has been read, the
       honest answer is null and the page says so. */
    lastReadOn,
    // The status bar is a fixture of the pre-launch period only: it disappears
    // by itself the moment every row has been read once, rather than waiting
    // for someone to remember to delete it.
    allRowsRead: rowsRead === DATASET_META.tool_count,
  }
}

/**
 * The newest date any field on this one tool was read.
 *
 * Per-tool, and taken from the fields rather than from the row's verification
 * date, because a row can carry a date that no individual field can back up —
 * which is how a page ends up claiming a freshness it does not have.
 */
export function toolLastReadOn(tool) {
  /* Per-field dates do not exist in the schema — no field carries a `read_on`.
     The date a row was read lives on `verification.last_verified`, set only when
     a person actually read it and null on every unread row.
     The field loop is kept for the day fields do carry their own dates, since a
     per-field date is strictly better evidence than a row-level one. */
  let latest = null
  for (const key of FIELD_ORDER) {
    const on = tool.fields?.[key]?.read_on
    if (on && (!latest || on > latest)) latest = on
  }
  const rowDate = tool.verification?.last_verified || null
  return latest && rowDate ? (latest > rowDate ? latest : rowDate) : latest || rowDate
}