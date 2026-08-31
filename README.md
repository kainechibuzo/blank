# [Working Title] — AI Transparency & Comparison

A public database and comparison tool that tells people, in plain English, what AI products actually
do with their data — and helps them find the best-fit tool without ad-influenced rankings.

> ### ⚠️ The dataset is draft
>
> All 20 rows are **unverified**. They exist to exercise the schema, the filters, the scoring and the
> chat layer. No human has read the linked policies. Nothing on this site is citable, screenshottable
> or publishable until a row says `verified` and carries a date. This is stated in the UI on every
> page, not buried here.

---

## What is built

**Phase 1 — transparency + comparison (working)**

- **Tool pages** (`/tools/:id`) — the eight tracked fields in plain English, with the score
  breakdown, the coverage figure, the source pages a reviewer must read, and an honest "draft" banner.
- **Comparison** (`/compare`) — 11 filters across data use, your rights, jurisdiction, commercials and
  data quality. Filters are additive and show live match counts. Sortable, shareable, URL-encoded.
- **Scoring** — fixed public weights; unknown scores zero; coverage shown beside every score so a thin
  row can't masquerade as a good one.

**Phase 3 — discovery (working, deterministic)**

- **Chat** (`/discover`) — describe what you need, get asked at most two clarifying questions, receive
  a ranked list. It is a *parser*, not an oracle: text → filter ids → `rankTools()`, the exact
  function `/compare` calls. Every answer carries a traceability panel and a link that reopens the
  identical result set on the public comparison page.

**Phase 2 — directory & ADUO (rules written, mechanism not built)**

- `/directory` documents submission, snippet verification, weekly re-checks, no-auto-ban, anti-gaming
  and ADUO — including proposed thresholds that are explicitly marked **unratified**. It is labelled
  "not live" and accepts no submissions.

**The rules**

- `/charter` — the one rule, written before there is revenue to bend it.
- `/sponsors` — the only page where money may ever appear. Separate route, separate data, imported by
  no other page.
- `/methodology` — the eight fields, scoring weights, the hash-check freshness loop, open questions,
  running costs.
- `docs/` — the same rules as files, including `01-the-one-rule.md` with an amendment log.

---

## Quickstart

```bash
npm install
npm run dev            # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on `0.0.0.0:5173` |
| `npm run build` / `npm run preview` | Production build / serve |
| `npm run check:traceability` | Runs the project's hard rules as assertions (fails on violation) |
| `npm run check:render` | Headless render of every route, catches runtime crashes |
| `npm run check` | Both of the above — wire this into CI |
| `npm run check:policies` | Weekly policy hash check; add `--save` to record baselines |

---

## Deploying to Vercel

This is a client-routed single-page app, so the **rewrite rule in `vercel.json` is not optional** —
without it, a direct visit to `/compare` or a refresh on `/tools/chatgpt` returns a 404, because
Vercel looks for a file at that path and there isn't one. `vercel.json` ships with the fallback
already configured, plus cache headers for hashed assets and a few baseline security headers.

### Option A — Git import (recommended)

1. Push the branch (already done: `arena/01a0580c-blank`).
2. Go to [vercel.com/new](https://vercel.com/new), import `kainechibuzo/blank`.
3. Vercel auto-detects **Vite**: build `npm run build`, output `dist`. Leave defaults alone.
4. Deploy. Every push to the production branch redeploys; other branches get preview URLs.

### Option B — CLI

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

### Before you point a domain at it

- [ ] **Delete the `noindex, nofollow` meta tag in `index.html`.** It is deliberately blocking the
      whole site from search engines while the dataset is draft. Forget this and the site is invisible.
- [ ] Verify the first batch of rows and attach real `last_verified` dates — do not publish draft data.
- [ ] Replace `[Working Title]` in `src/data/schema.js` (`SITE.name`) before anyone sees it.
- [ ] Turn on the weekly policy hash check somewhere that can run cron (GitHub Actions is fine) —
      Vercel's hobby plan does not run cron jobs.
- [ ] Add `npm run check` to CI so the hard rules fail the build if a sponsor field or a fabricated
      verification date ever sneaks in.

### Vercel-specific notes

- No environment variables or secrets are needed. There is no backend, no database, no API keys.
- The site makes no third-party requests — no analytics, no fonts, no pixels — so there is nothing to
  configure for CSP beyond what's in `vercel.json`.
- Static hosting is free at this scale; the $20–50/mo estimate in the roadmap covers the point where
  alerts and accounts need a real backend.

---

## Structure

```
src/
  data/schema.js       field definitions, options, filters, verification statuses
  data/tools.js        the 20-row provider database (all draft)
  lib/scoring.js       transparency score + coverage
  lib/filters.js       rankTools() — the single ranking path
  lib/chat.js          deterministic query → filters parser (Phase 3)
  lib/traceability.js  the hard rules, executable
  lib/watchlist.js     browser-local "watch this tool"
  components/          Layout, ToolCard, FilterRail, ScoreDial, Pill, …
  pages/               Home, Compare, ToolPage, Discover, Methodology, Charter, Directory, Sponsors
scripts/
  check-policy-hashes.mjs   weekly freshness: fetch → normalise → hash → report
  traceability-check.mjs    CI assertion runner
  render-check.jsx          SSR smoke test for every route
docs/                  the written rules
```

---

## Adding or verifying a tool

1. Add a row in `src/data/tools.js` via the `tool()` factory. It starts `draft-unverified` with
   `last_verified: null` — there is no other default.
2. Write each field's `note` as what a reviewer must check, not as a claim.
3. Only when a human has read the linked policies: set `verification.status` to `verified`, add
   `last_verified`, `reviewer` and `method`. **Never fabricate the date** — a traceability check fails
   the build if one exists without verified status.
4. Run `npm run check`.

---

## Non-negotiables

1. **Sponsorship never touches the honest side** — not coverage, not summaries, not ranking, not
   badges, not review turnaround. Enforced by a build check that scans the dataset for 14 forbidden
   keys.
2. **Chat is a view, never an independent judgement.** One ranking function. No model in the ranking
   path.
3. **Signals stay separate.** Transparency score, data coverage and community signal are never summed.
4. **Paraphrase only.** No policy text is reproduced verbatim; nothing here is legal advice.
5. **Unknown is visible.** It scores zero and is reported as coverage, never smoothed into an average.

---

## Running cost

Hosting + DB $20–50/mo · domain ~$15/yr · initial extraction $10–30 one-off · ongoing freshness ~$0
plus founder time. The real cost is verification labour and ADUO review — founder hours, not servers.
See `docs/06-open-questions-and-costs.md`.

## Not this product

"Which APIs can I use as a student in Nigeria" is a real idea with a different schema and audience —
parked as a separate product rather than merged in and diluted.
