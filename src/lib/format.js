/**
 * format.js — one way to write a date, used everywhere.
 *
 * "2 Sept 2026" rather than "2026-09-02": the people this site is for are not
 * reading ISO strings, and a date nobody can parse is a date nobody checks.
 */
export function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
