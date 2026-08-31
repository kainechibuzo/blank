import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'

const routes = ['/', '/compare', '/compare?f=no_training,eu_residency&sort=coverage', '/tools/chatgpt', '/tools/le-chat', '/discover', '/methodology', '/charter', '/directory', '/sponsors', '/nope']
let failed = 0
for (const r of routes) {
  try {
    const html = renderToString(<MemoryRouter initialEntries={[r]}><App /></MemoryRouter>)
    const ok = html.length > 500
    console.log(`${ok ? 'OK  ' : 'THIN'} ${r}  ${html.length} bytes`)
    if (!ok) failed++
  } catch (e) {
    failed++
    console.log(`FAIL ${r}\n     ${e.message}`)
  }
}
console.log(failed ? `\n${failed} route(s) failed` : '\nall routes rendered')
process.exit(failed ? 1 : 0)
