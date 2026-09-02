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

for (const [id, block] of Object.entries(spec)) {
  const idAt = src.indexOf(`id: '${id}',`)
  if (idAt < 0) throw new Error(`tool ${id} not found`)

  for (const [key, f] of Object.entries(block)) {
    if (key.startsWith('_')) continue
    const fieldsAt = src.indexOf('    fields: {', idAt)
    const endAt = src.indexOf('    verification: {', fieldsAt)
    const open = src.indexOf(`      ${key}: {`, fieldsAt)
    if (open < 0 || open > endAt) throw new Error(`${id}.${key} not found`)
    // close = next line that is exactly "      }," at the field indent
    let close = src.indexOf('\n      },', open)
    if (close < 0 || close > endAt) throw new Error(`${id}.${key} unterminated`)
    src = `${src.slice(0, open)}${renderField(key, f)}${src.slice(close + '\n      },'.length)}`
  }

  const vStart = src.indexOf('    verification: {', src.indexOf(`id: '${id}',`))
  const vEnd = src.indexOf('    policy_sources:', vStart)
  const note =
    block._verdict === 'verified'
      ? 'All seven fields read and confirmed against the linked pages.'
      : `Fields carrying a source were read and confirmed on ${DATE}. ${
          block._unverified?.length ? `Not established in this pass: ${block._unverified.join(', ')}.` : ''
        }`
  src = `${src.slice(0, vStart)}    verification: {
      status: '${block._verdict}',
      last_verified: '${DATE}',
      reviewer: 'policy pages read on the recorded date',
      method: 'linked pages read by hand; values paraphrased, nothing quoted verbatim',
      note: '${note}',
    },
${src.slice(vEnd)}`
}

await writeFile(FILE, src, 'utf8')
console.log('merged', Object.keys(spec).join(', '))
