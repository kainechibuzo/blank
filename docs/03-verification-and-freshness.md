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
- Verification status and date are separate fields. A stale verified row is worse than an honest
  unknown, because it launders uncertainty as fact.
- Paraphrase only. No clause is reproduced verbatim; a paraphrase is not a legal interpretation, and
  every row links to the source so a reader can check.

## Shelf life

Target re-read window: 90 days. Hard trigger: any policy hash change. Rows older than 120 days render
as red on the tool page; over 60 days render as amber.

> **Unresolved.** What happens when the tool count makes one person the bottleneck? Options: paid
> reviewers with a public corrections process, or narrowing scope. Not decided.
