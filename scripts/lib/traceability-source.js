/**
 * traceability-source.js — hard rules that can only be checked by reading the
 * source tree.
 *
 * Node only. Nothing in src/pages or src/components imports this, so it never
 * reaches the browser bundle; scripts/traceability-check.mjs is its only caller.
 */

import { readFile, readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

async function read(rel) {
  return readFile(join(ROOT, rel), 'utf8')
}

/**
 * Strip comments before scanning for forbidden patterns. The rules are about
 * what the code does, and half of this codebase's value is prose explaining
 * what the code must never do — a scanner that trips on the word "delist"
 * inside a comment would punish exactly the documentation that enforces it.
 */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
}

async function walk(relDir, out = []) {
  let entries
  try {
    entries = await readdir(join(ROOT, relDir), { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const rel = `${relDir}/${e.name}`
    if (e.isDirectory()) await walk(rel, out)
    else if (/\.(js|jsx|ts|tsx|mjs|sql)$/.test(e.name)) out.push(rel)
  }
  return out
}

export async function runSourceChecks() {
  const checks = []
  const push = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail })

  /* 1 — The weekly snippet re-check can flag. It must never punish.
         Scan for actual removal *writes*, not for the word appearing in a log
         line or a comment: the script is allowed to say "nothing was delisted",
         it is not allowed to do it. */
  let snippetScript = ''
  try {
    snippetScript = await read('scripts/check-directory-snippets.mjs')
  } catch {
    snippetScript = ''
  }
  const codeOnly = stripComments(snippetScript)
  const removalWrites = [
    /status\s*[:=]\s*['"](delisted|banned|removed|hidden)['"]/i,
    /\.delete\s*\(/,
    /\bdelete\s+from\b/i,
    /listings\?[^'"]*status=eq\.(delisted|banned|removed|hidden)/i,
  ].filter((re) => re.test(codeOnly))

  push(
    'Weekly snippet re-check cannot delist, ban, or hide a listing',
    snippetScript.length > 0 && removalWrites.length === 0,
    removalWrites.length
      ? `removal write found in scripts/check-directory-snippets.mjs: ${removalWrites.map(String).join(', ')}`
      : 'script writes only snippet_state, review_required, review_reason and warning_message'
  )

  push(
    'Weekly snippet re-check flags for human review',
    /review_required/.test(codeOnly) && /warning_message/.test(codeOnly),
    'flagging path present'
  )

  /* 2 — The service role key must never appear in browser code. */
  const files = await walk('src')
  // Matches reads and assignments with a real value, not the bare name
  // appearing in setup instructions — the admin dashboard prints the deploy
  // command, and that must not trip this.
  const roleRead =
    /(?:import\.meta\.env|env|process\.env)[.\["']SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?[A-Za-z0-9._-]{12,}/
  const leakHits = []
  for (const f of files) {
    const src = stripComments(await read(f))
    if (roleRead.test(src)) leakHits.push(f)
  }
  push(
    'No browser code references the Supabase service-role key',
    leakHits.length === 0,
    leakHits.length ? leakHits.join(', ') : `${files.length} client files scanned`
  )

  /* 3 — The ranking path must not touch the directory database. This is the
     structural guarantee that directory data cannot influence the comparison. */
  const rankingFiles = ['src/lib/scoring.js', 'src/lib/filters.js', 'src/lib/chat.js']
  const dbHits = []
  for (const f of rankingFiles) {
    const src = await read(f)
    if (/supabase|listings|snippet_checks|votes|campaigns|aduo/.test(src)) dbHits.push(f)
  }
  push(
    'Ranking and scoring never read the directory database',
    dbHits.length === 0,
    dbHits.length
      ? `directory or vote references in the ranking path: ${dbHits.join(', ')}`
      : `${rankingFiles.join(', ')} are pure functions over the provider dataset — no votes, no directory`
  )

  /* 4 — The verification snippet must stay public-crawl only. */
  const snippetLib = await read('src/lib/snippet.js')
  const forbiddenAccess = [
    /authorization/i,
    /cookie/i,
    /api[_-]?key/i,
    /bearer/i,
    /password/i,
    /login/i,
  ].filter((re) => re.test(snippetLib))
  push(
    'Ownership verification is public-crawl only (no credentials, keys or logins)',
    forbiddenAccess.length === 0,
    forbiddenAccess.length
      ? `suspicious patterns in src/lib/snippet.js: ${forbiddenAccess.join(', ')}`
      : 'snippet.js fetches one public page and reads one meta tag'
  )

  /* 5 — The DB must also refuse automatic removal, not just the script. */
  let sql = ''
  try {
    sql = await read('supabase/migrations/0001_phase2_directory.sql')
  } catch {
    sql = ''
  }
  push(
    'Database refuses non-founder status changes (guard_listing_status trigger)',
    sql.includes('guard_listing_status') && sql.includes('raise exception'),
    sql ? 'trigger present on public.listings' : 'migration not found'
  )

  /* 6 — the anti-gaming numbers a visitor is told must be the ones the
         database actually enforces. Otherwise the UI describes one site and the
         database runs another. */
  const votesJs = await read('src/lib/votes.js')
  const votingSql = await read('supabase/migrations/0002_voting.sql').catch(() => '')
  const { VOTE_MIN_ACCOUNT_AGE_DAYS, VOTE_DECAY_PER_DAY } = await import('../../src/lib/votes.js')

  const sqlAge = votingSql.match(/interval '(\d+) days'/)?.[1]
  push(
    'Account-age rule in the UI matches the one the database enforces',
    Number(sqlAge) === VOTE_MIN_ACCOUNT_AGE_DAYS,
    `UI says ${VOTE_MIN_ACCOUNT_AGE_DAYS} days, database enforces ${sqlAge ?? 'nothing'}`
  )

  const sqlFactor = votingSql.match(/power\(([\d.]+)::numeric/)?.[1]
  const expectedFactor = Number((1 - VOTE_DECAY_PER_DAY).toFixed(2))
  push(
    'Vote decay rate in the UI matches the one the database applies',
    Math.abs(Number(sqlFactor) - expectedFactor) < 0.001,
    `UI says ${VOTE_DECAY_PER_DAY * 100}%/day (factor ${expectedFactor}), SQL uses ${sqlFactor}`
  )

  push(
    'One vote per account is enforced by the table, not by the interface',
    /primary key\s*\(\s*listing_id\s*,\s*voter_id\s*\)/i.test(votingSql),
    'votes has primary key (listing_id, voter_id)'
  )

  push(
    'One promotion campaign per submitter per week is enforced by the table',
    /create unique index[\s\S]{0,120}campaigns_one_per_submitter_per_week[\s\S]{0,120}\(created_by, week_start\)/.test(
      votingSql
    ),
    'unique index on (created_by, week_start)'
  )

  /* 7 — the captcha secret is a server secret. If it is ever read in src/, it
         lands in the bundle and anyone can mint passing tokens. Naming it in
         setup instructions is fine; reading it is not, so this matches reads and
         assignments rather than the bare word. */
  const secretRead = /(?:import\.meta\.env|env|process\.env)[.\[\"'](?:VITE_)?HCAPTCHA_SECRET|(?:VITE_)?HCAPTCHA_SECRET\s*[:=]|Deno\.env\.get\(/
  const secretHits = []
  for (const f of files) {
    const src = stripComments(await read(f))
    if (secretRead.test(src)) secretHits.push(f)
  }
  push(
    'Captcha secret never appears in browser code',
    secretHits.length === 0,
    secretHits.length ? secretHits.join(', ') : 'verified server-side in the cast-vote function'
  )

  /* 8 — the vote path must be server-side, or every check above is optional. */
  push(
    'Votes are written through the cast-vote function, never straight to the table',
    /functions\.invoke\('cast-vote'/.test(stripComments(votesJs)) &&
      !/from\('votes'\)\s*\.insert/.test(stripComments(votesJs)),
    'client calls cast-vote; inserts happen only inside the function'
  )

  /* 9 — the 24-hour edit window is a promise made in the interface, so it has
         to be the rule the database enforces. */
  const listingsJs = await read('src/lib/listings.js')
  const editSql = await read('supabase/migrations/0003_submission_edit_window.sql').catch(() => '')
  const { EDIT_WINDOW_HOURS } = await import('../../src/lib/listings.js')

  const sqlHours = editSql.match(/interval '(\d+) hours'/)?.[1]
  push(
    'Submission edit window in the UI matches the one the database enforces',
    Number(sqlHours) === EDIT_WINDOW_HOURS,
    `UI says ${EDIT_WINDOW_HOURS}h, database sets ${sqlHours ?? 'nothing'}`
  )

  push(
    'Editing is time-boxed in row level security, not just hidden in the UI',
    /now\(\)\s*<\s*editable_until/.test(editSql),
    'update policy requires now() < editable_until'
  )

  push(
    'The edit window cannot be extended',
    /freeze_edit_window/.test(editSql),
    'trigger resets editable_until to its original value on every update'
  )

  push(
    'Verification state cannot be set by hand',
    /guard_snippet_state/.test(editSql),
    'only the weekly check (service role) may write snippet_state'
  )

  const sharedSrc = stripComments(await read('src/components/SubmissionList.jsx'))
  const accountSrc = stripComments(await read('src/pages/Account.jsx'))
  const directorySrc = stripComments(await read('src/pages/Directory.jsx'))

  // The edit button existed on /directory and was missing from /account until
  // both were pointed at one component. This is what stops that recurring.
  push(
    'Submission controls are shared, so they cannot differ between pages',
    /<SubmissionList/.test(accountSrc) && /<SubmissionList/.test(directorySrc),
    '/account and /directory render the same SubmissionList component'
  )

  push(
    'Re-verification is available after the edit window closes',
    /requestVerification/.test(stripComments(listingsJs)) && /requestVerification/.test(sharedSrc),
    'verification is not a one-shot favour granted at submission'
  )

  /* 10 — the stripes are gone, so this asserts the caveat survived the
          redesign: an unverified card still differs from a verified one in
          more than a single small pill. */
  const card = stripComments(await read('src/components/ToolCard.jsx'))
  push(
    'Unverified rows remain visibly distinct without the striped wash',
    /Draft — unverified/.test(card) && /border-mixed\/40/.test(card) && /hatch-edge/.test(card),
    'labelled strip above the score, amber border, solid amber edge'
  )

  /* 11 — the admin dashboard is the roadmapped "a human reviews first" step,
          so its own powers need bounding too. */
  const adminSrc = stripComments(await read('src/pages/Admin.jsx'))
  const adminSql = await read('supabase/migrations/0004_admin_dashboard.sql').catch(() => '')

  push(
    'Admin dashboard is gated on the founder role, not on knowing the URL',
    /isFounder/.test(adminSrc) && /Founder access required/.test(adminSrc),
    'page refuses to render without the founder role'
  )

  push(
    'Every admin decision requires a written reason',
    /if \(!reason\)/.test(adminSrc) && /record\(/.test(adminSrc),
    'an action without a reason is rejected before anything is written'
  )

  push(
    'Admin decisions are written to an audit log',
    /admin_actions/.test(adminSrc) && /append-only|revoke update, delete/i.test(adminSql),
    'log is insert-only; updates and deletes are revoked at the database level'
  )

  push(
    'Admin cannot edit a transparency score, a ranking, or a provider row',
    !/from\('tools'\)/.test(adminSrc) && /cannot change a transparency score/i.test(adminSrc),
    'no write path to provider data, and the limit is stated in the interface'
  )

  push(
    'Vote oversight reports shape, never who voted',
    /admin_vote_signals/.test(adminSql) && !/voter_id/.test(adminSrc),
    'aggregate counts only; the dashboard never renders a voter identity'
  )

  /* 12 — Stage 3. ADUO is a deliberate, disclosed exception to "ranking
          follows votes", which is exactly why it needs fencing. */
  const { ADUO } = await import('../../src/lib/aduo.js')
  const aduoSql = await read('supabase/migrations/0005_aduo_and_duplicates.sql').catch(() => '')
  const aduoJs = stripComments(await read('src/lib/aduo.js'))
  const adminJs = stripComments(await read('src/pages/Admin.jsx'))
  const snippetScriptCode = stripComments(snippetScript)

  push(
    'ADUO thresholds are not ratified',
    ADUO.ratified === false && /ratified: false/.test(aduoJs),
    'flipping ratified to true requires a date and a record alongside it'
  )

  push(
    'ADUO cannot be granted automatically — no job, no threshold crossing',
    !/aduo/i.test(snippetScriptCode) && /decideAduo/.test(adminJs) && /aduo_granted_at/.test(adminJs),
    'the weekly job never touches ADUO; only a founder decision writes it'
  )

  push(
    'An ADUO grant requires the checkable criteria and two human attestations',
    /computablePass/.test(adminJs) && /form\.traffic && form\.reviews/.test(adminJs),
    'criteria-bound, not discretionary: the button is disabled without them'
  )

  push(
    'The site key is computed identically in the app and in SQL',
    /export function siteKeyOf/.test(stripComments(await read('src/lib/sites.js'))) &&
      /function public\.site_key_of/.test(aduoSql),
    'both normalise to host + path, lowercased, without scheme, www or query'
  )

  /* 13 — Edge Function failures are diagnosed, never guessed.

          A deployed function that answered 404 with "Listing not found, or not
          yours" used to be reported as "not deployed", because the old code
          inferred the cause from the wording of the reply. The wording of a
          reply is not evidence of whether a function exists; the error class
          and HTTP status are. These four checks keep it that way. */
  const functionDirs = (await readdir(join(ROOT, 'supabase/functions'), { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => `supabase/functions/${e.name}/index.ts`)

  const functionSources = await Promise.all(
    functionDirs.map(async (rel) => ({ rel, src: stripComments(await read(rel).catch(() => '')) }))
  )
  const corsModule = stripComments(
    await read('supabase/functions/_shared/cors.ts').catch(() => '')
  )

  push(
    'Every Edge Function answers CORS, including the preflight',
    functionSources.length > 0 &&
      functionSources.every(({ src }) => /_shared\/cors\.ts/.test(src) && /withCors|preflight/.test(src)) &&
      /Access-Control-Allow-Origin/.test(corsModule) &&
      /req\.method === 'OPTIONS'/.test(corsModule),
    'a reply without those headers is discarded by the browser, which looks exactly like "not deployed"'
  )

  push(
    'Edge Function failures are classified in exactly one place',
    (await Promise.all(
      ['src/lib/listings.js', 'src/pages/SubmitListing.jsx', 'src/pages/Admin.jsx'].map((rel) =>
        read(rel).catch(() => '')
      )
    )).every((src) => /from '\.\.\/lib\/edge\.js'|from '\.\/edge\.js'/.test(stripComments(src))),
    'every call site routes through src/lib/edge.js instead of reading error text itself'
  )

  const srcFiles = await walk('src')
  const srcBodies = await Promise.all(srcFiles.map((rel) => read(rel).catch(() => '')))
  const guessers = srcFiles.filter(
    (rel, i) =>
      rel !== 'src/lib/edge.js' &&
      /Failed to send a request|is not deployed yet|not found\|Failed to/i.test(
        stripComments(srcBodies[i])
      )
  )

  push(
    'Nothing infers "not deployed" from the wording of an error',
    guessers.length === 0,
    guessers.length
      ? `still guessing in ${guessers.join(', ')}`
      : 'the error class and HTTP status are the only evidence used'
  )

  push(
    '/admin shows which project it is calling',
    /edgeFunctionUrl/.test(adminJs) && /probeEdgeFunction/.test(adminJs),
    'a project reference with one character wrong is visible, not inferred from an error message'
  )

  /* 14 — The policy observer records; it never verifies.

          A bot that fetches a page is not a person who read it. The whole
          point of this product is that a human confirmed each row against the
          page on a recorded date, so the cheap automation must be physically
          unable to fake that. */
  const observer = stripComments(await read('scripts/check-policy-hashes.mjs'))
  const gitignore = await read('.gitignore').catch(() => '')
  const { VERIFICATION_STATUSES } = await import('../../src/data/schema.js')

  push(
    'The policy observer cannot verify a row',
    !/status\s*[:=]\s*['"]verified['"]/.test(observer) &&
      !/last_verified\s*[:=]\s*(?!null)\S/.test(observer) &&
      !/writeFile\([^)]*tools\.js/.test(observer),
    'it writes observations only; only a person sets verification'
  )

  push(
    'Matched policy text is never committed',
    /policy-excerpts\.local\.json/.test(gitignore) &&
      /flag\('excerpts'\)/.test(observer) &&
      /EXCERPT_FILE/.test(observer),
    'sentences go to a gitignored local file for a human reviewer, never the repo'
  )

  push(
    'Observed and verified are different states',
    Boolean(VERIFICATION_STATUSES.observed) &&
      VERIFICATION_STATUSES.observed.tone !== 'good' &&
      VERIFICATION_STATUSES.verified.tone === 'good',
    'a fetch is recorded as observed; only a human read makes it verified'
  )

  const { TOOLS: TOOLS_FOR_SOURCES } = await import('../../src/data/tools.js')
  const unsourced = TOOLS_FOR_SOURCES.filter(
    (t) => !Array.isArray(t.policy_sources) || !t.policy_sources.length ||
      !t.policy_sources.every((s) => /^https?:\/\//.test(s.url ?? ''))
  )

  push(
    'Every provider cites at least one real policy URL',
    unsourced.length === 0,
    unsourced.length ? `no source for ${unsourced.map((t) => t.id).join(', ')}` : 'no row exists without a link to the page it came from'
  )

  push(
    'The same person cannot claim the same site twice',
    /listings_one_per_owner_per_site/.test(aduoSql) && /site_key/.test(
      stripComments(await read('src/pages/SubmitListing.jsx'))
    ),
    'unique index on (owner_id, site_key), plus a pre-write check in the form'
  )

  return checks
}
