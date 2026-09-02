import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App.jsx'
import { AuthProvider } from '../src/lib/auth.jsx'

const routes = ['/', '/what/medical-info', '/what/something-else?q=my%20tax%20return', '/what/code', '/compare', '/compare?f=no_training,eu_residency&sort=coverage', '/compare?f=no_human_review&sort=name', '/tool/chatgpt', '/tool/microsoft-copilot', '/tools/chatgpt', '/tools/le-chat', '/discover', '/methodology', '/charter', '/directory', '/directory/submit', '/account', '/admin', '/sponsors', '/dev/states', '/nope']
let failed = 0
for (const r of routes) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[r]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )
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
