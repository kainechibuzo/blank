# Verification & freshness

The ongoing cost of this business is human reading time, not servers. Everything below exists to
spend that time only where it changes something.

## The loop

1. **Collect** — record the policy pages that govern the product, per tier. Consumer and enterprise
   terms are frequently different documents.
2. **Extract** — an LLM-assisted pass fills the eight fields. Output is a draft, never a publication.
3. **Verify** — a human reads the source, confirms or corrects each field, and signs the row. Only now
   may a date be attached.
4. **Watch** — a weekly hash check. A change queues re-extraction and re-verification; the date resets
   or the row flips to `stale`.

## The policy observer

`scripts/check-policy-hashes.mjs` is the bot. Every week it fetches all 41 policy pages the dataset
cites, records what it saw, and hashes each one. It is the cheapest possible way to know when
something moved.

```bash
npm run check:policies                                   # report only
node scripts/check-policy-hashes.mjs --save              # record this run
node scripts/check-policy-hashes.mjs --only=chatgpt      # one tool
node scripts/check-policy-hashes.mjs --dry-run           # print the plan, no network
node scripts/check-policy-hashes.mjs --strict            # exit 1 on fetch failure
node scripts/check-policy-hashes.mjs --excerpts          # also write local-only sentences
node scripts/check-policy-hashes.mjs --fixtures=test/fixtures/policy-pages
                                                         # no network; read saved pages
```

### What it records

For each page: HTTP status, fetch time, byte count, `<title>`, a SHA-256 of the normalised text, and
**signals** — which of the patterns in `src/lib/policy-patterns.js` fired, and how many times. Those
roll up per provider into a suggested value per field, with a confidence:

| confidence | meaning |
| --- | --- |
| `high` | two or more distinct patterns agree, or one distinctive pattern fires repeatedly |
| `medium` | a single pattern fired |
| `conflicted` | patterns disagree. Reported as a conflict — **never resolved by the bot** |
| `none` | the page says nothing usable about this field. Information, not failure |

The run also lists where observed language disagrees with what the dataset currently says, which is
the actual work queue: `dataset=stated  observed=short` is a row worth a person's ten minutes.

### What it is not

**It is not a verifier, and it cannot be one.** It cannot set `status: 'verified'`, cannot write
`last_verified`, and cannot touch `src/data/tools.js` — three traceability checks fail the build if it
ever grows that ability. A machine that fetched a page is not a person who read it, and the two dates
stay separate forever: `checked_at` (bot) and `last_verified` (human).

So a fetch produces the `observed` verification state — *"the page was fetched and recorded; no human
has confirmed it"* — which renders as its own visible unknown, never as the green Verified pill.

**No policy text is stored.** A match records the pattern's id and a count. Not the sentence, not the
words around it, not the heading. The project paraphrases policy and never quotes it, and a bot with a
database is exactly where that rule would quietly die. When you need to read the sentences to judge a
suggestion, run `--excerpts`: that writes `data/policy-excerpts.local.json`, which is gitignored,
never committed, never uploaded, never rendered.

### Why it is tested against saved pages

`scripts/check-observer.mjs` runs the whole thing against invented pages in
`test/fixtures/policy-pages/` — no network, so it passes in CI and on a plane. The assertions are
mostly about restraint: conflicting language must be reported as a conflict, a page that says nothing
must yield `none` rather than a guess, and a fixture run must refuse to overwrite real observations.
The failure mode worth engineering against is not a bot that fails; it is a bot that succeeds
confidently.

## Hash checking, not re-scraping

Re-extracting every policy on a schedule gets slower and more expensive every time a tool is added.
Instead:

```bash
npm run check:policies                                   # report only
node scripts/check-policy-hashes.mjs --save              # record new hashes
node scripts/check-policy-hashes.mjs --only=chatgpt      # one tool
node scripts/check-policy-hashes.mjs --dry-run           # print the plan, no network
node scripts/check-policy-hashes.mjs --strict            # exit 1 on fetch failure
```

The job fetches each page, normalises it (scripts, styles, comments, whitespace stripped, lowercased),
and hashes it. **Only rows whose hash changed** enter the expensive pipeline.

### Honest limitations

- A changed hash means "a human should look", never "the policy changed". Pages embed CSRF tokens,
  timestamps and A/B copy, so false positives are expected and acceptable — the cost of a false
  positive is one human glance.
- It works only on pages that exist and can be fetched. That is the core provider database.
- It is **not** the Phase 2 snippet mechanism, which requires a cooperating counterparty. Providers in
  this database have no reason to install anything, and no amount of engineering changes that.

## Rules that keep this honest

- A row is `verified` only when a named human read the linked policy on the recorded date.
- A bot cannot verify. Its observations land in `data/policy-hashes.json`, never in the dataset, and
  the two dates (`checked_at` vs `last_verified`) keep the distinction visible in the data itself.
- Verification status and date are separate fields. A stale verified row is worse than an honest
  unknown, because it launders uncertainty as fact.
- Paraphrase only. No clause is reproduced verbatim; a paraphrase is not a legal interpretation, and
  every row links to the source so a reader can check.

## Shelf life

Target re-read window: 90 days. Hard trigger: any policy hash change. Rows older than 120 days render
as red on the tool page; over 60 days render as amber.

> **Unresolved.** What happens when the tool count makes one person the bottleneck? Options: paid
> reviewers with a public corrections process, or narrowing scope. Not decided.

## Corrected 2026-09-01

Five rows (ChatGPT, Claude, Gemini, Perplexity, Le Chat) carried `status: 'verified'` with
`last_verified: '2026-08-31'` while the file's own header said no one had opened any of the linked
policies. They rendered to users as green Verified pills that had not been earned — the single most
misleading thing on the site, because it laundered invented values as read-and-confirmed ones.

They were downgraded to `draft-unverified` with `last_verified: null`. Nothing in the dataset now
claims verification. Earning it back is the human reading pass described above.
