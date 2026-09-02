import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'
import { AuthProvider } from '../src/lib/auth.jsx'
import { MAX } from '../src/lib/scoring.js'
import { FIELD_ORDER } from '../src/data/schema.js'

const routes = ['/', '/what/medical-info', '/what/something-else?q=my%20tax%20return', '/what/code', '/compare', '/compare?f=no_training,eu_residency&sort=coverage', '/compare?f=no_human_review&sort=name', '/tool/chatgpt', '/tool/microsoft-copilot', '/tools/chatgpt', '/tools/le-chat', '/discover', '/methodology', '/charter', '/directory', '/directory/submit', '/account', '/admin', '/sponsors', '/dev/states', '/nope']
let failed = 0
const html = {}
for (const r of routes) {
  try {
    const out = renderToString(
      <MemoryRouter initialEntries={[r]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )
    const ok = out.length > 500
    html[r] = out
    console.log(`${ok ? 'OK  ' : 'THIN'} ${r}  ${out.length} bytes`)
    if (!ok) failed++
  } catch (e) {
    failed++
    console.log(`FAIL ${r}\n     ${e.message}`)
  }
}

/**
 * The methodology page publishes the scorer's weights.
 *
 * Section 3 renders MAX straight out of scoring.js, so it cannot drift by
 * construction — unless somebody hardcodes a number into the JSX, which is the
 * edit a well-meaning person makes when they want a table to read nicely. This
 * compares what the page actually rendered against the source, so the page is
 * held to the same standard as the data: if it prints a number, the number has
 * to be true.
 *
 * It lives here rather than in the traceability suite because it has to render
 * the page, and only this script is bundled with JSX support.
 */
function checkMethodologyWeights() {
  const page = html['/methodology'] ?? ''
  const shown = [...page.matchAll(/data-weight="([^"]+)"[^>]*>\s*(\d+)\s*</g)].map((m) => ({
    key: m[1],
    value: Number(m[2]),
  }))
  const expectedTotal = Object.values(MAX).reduce((a, b) => a + b, 0)
  const problems = []
  const seen = shown.map((w) => w.key)

  for (const { key, value } of shown) {
    const expected = key === 'total' ? expectedTotal : MAX[key]
    if (expected === undefined) problems.push(`${key} is not a field we score`)
    else if (value !== expected) problems.push(`${key} shows ${value}, scoring.js says ${expected}`)
  }
  for (const key of FIELD_ORDER) {
    if (!seen.includes(key)) problems.push(`${key} is scored but not shown on the page`)
  }
  if (!seen.includes('total')) problems.push('the page does not state the total')

  if (problems.length) {
    failed++
    console.log(`FAIL methodology weights — ${problems.join('; ')}`)
  } else {
    console.log(`OK   methodology weights — ${seen.length - 1} weights, total ${expectedTotal}, all matching scoring.js`)
  }
}
checkMethodologyWeights()

console.log(failed ? `\n${failed} route(s) failed` : '\nall routes rendered')
process.exit(failed ? 1 : 0)
