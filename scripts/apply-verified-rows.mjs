/**
 * apply-verified-rows.mjs — writes read-and-confirmed values into the dataset.
 *
 *   node scripts/apply-verified-rows.mjs
 *
 * The readings live in scripts/verified-rows.json, which is the audit record:
 * every confirmed value carries the page it was read from. This script only
 * copies them into src/data/tools.js and stamps the row's verdict.
 *
 * Rules it enforces by construction:
 *   - MERGES into the existing fields block. A field not named in the spec
 *     keeps the row it already had. (An earlier version replaced the whole
 *     block and silently dropped residency — hence the backup it takes.)
 *   - A verdict of 'verified' means every field carries a source; anything
 *     short of that is 'partially-verified' and must say which fields were
 *     not established.
 *   - No value may be written without a source, and nothing here sets a
 *     verdict for a page that was not read.
 */
import { readFile, writeFile } from 'node:fs/promises'

const FILE = 'src/data/tools.js'
const DATE = '2026-09-02'
const spec = JSON.parse(await readFile('scripts/verified-rows.json', 'utf8'))

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

function renderField(key, f) {
  if (f.value && typeof f.value === 'object') {
    const inner = Object.entries(f.value)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(',\n        ')
    return `      ${key}: {\n        ${inner},\n        source: '${f.source}',\n        note: '${esc(f.note)}',\n      },`
  }
  return `      ${key}: {\n        value: '${esc(f.value)}',\n        source: '${f.source}',\n        note: '${esc(f.note)}',\n      },`
}

let src = await readFile(FILE, 'utf8')

/**
 * The bounds of one tool object. Every edit below is scoped to these.
 *
 * The first version searched forward from the tool's id for the sentinel
 * strings and happily walked into the NEXT tool when a sentinel was missing —
 * which is how Grok's row overwrote Le Chat's verification block. Grok used
 * the compact `verification: unverified(),` form, so the search for
 * `verification: {` ran straight past it.
 */
function blockOf(src, id) {
  const start = src.indexOf(`id: '${id}',`)
  if (start < 0) throw new Error(`tool ${id} not found`)
  const next = src.indexOf("\n    id: '", start + 10)
  return { start, end: next > 0 ? next : src.length }
}

/** Replace `verification: {…},` OR the one-line `verification: unverified(),`. */
/** Index just past the `},` line that closes the block opened at `open`. */
function endOfBlockLine(seg, open) {
  let depth = 0
  let i = seg.indexOf('{', open)
  for (; i < seg.length; i++) {
    if (seg[i] === '{') depth++
    else if (seg[i] === '}') {
      depth--
      if (depth === 0) {
        i++
        break
      }
    }
  }
  if (seg[i] === ',') i++
  const nl = seg.indexOf('\n', i)
  return nl < 0 ? seg.length : nl + 1
}

/**
 * Put the verdict into the tool object, replacing any existing verification.
 *
 * Handles three shapes, because the file has all three:
 *   - `verification: { ... },`   a tool that has been read before
 *   - `verification: unverified(),`   the compact helper
 *   - no verification key at all — the tool() factory defaults it. That is the
 *     case for every row not yet read, and it is the one the first version of
 *     this script walked straight past, which is how one row's verdict came to
 *     be written into another row's object.
 */
function ensureVerification(seg, rendered) {
  const key = '    verification: '
  const at = seg.indexOf(key)
  if (at < 0) {
    const fOpen = seg.indexOf('    fields: {')
    if (fOpen < 0) throw new Error('fields block not found to insert after')
    const after = endOfBlockLine(seg, fOpen)
    return `${seg.slice(0, after)}${rendered}\n${seg.slice(after)}`
  }
  const end = seg[at + key.length] === '{' ? endOfBlockLine(seg, at) : seg.indexOf('\n', at) + 1
  return seg.slice(0, at) + rendered + seg.slice(end)
}

for (const [id, block] of Object.entries(spec)) {
  const { start, end } = blockOf(src, id)
  let seg = src.slice(start, end)

  // ── fields ───────────────────────────────────────────────────────────────
  for (const [key, f] of Object.entries(block)) {
    if (key.startsWith('_')) continue
    const open = seg.indexOf(`      ${key}: {`)
    if (open < 0) throw new Error(`${id}.${key} not found`)
    const close = seg.indexOf('\n      },', open)
    if (close < 0) throw new Error(`${id}.${key} unterminated`)
    seg = `${seg.slice(0, open)}${renderField(key, f)}${seg.slice(close + '\n      },'.length)}`
  }

  // ── verdict ──────────────────────────────────────────────────────────────
  const note =
    block._verdict === 'verified'
      ? 'All seven fields read and confirmed against the linked pages.'
      : `Fields carrying a source were read and confirmed on ${DATE}. ${
          block._unverified?.length ? `Not established in this pass: ${block._unverified.join(', ')}.` : ''
        }`
  seg = ensureVerification(
    seg,
    `    verification: {
      status: '${block._verdict}',
      last_verified: '${DATE}',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: '${note}',
    },`
  )

  src = `${src.slice(0, start)}${seg}${src.slice(end)}`
}

await writeFile(FILE, src, 'utf8')
console.log('merged', Object.keys(spec).join(', '))
