# Phase 2 — directory, verification & ADUO

**Not live.** This file exists so the rules are written before the mechanism is built. The
`/directory` page mirrors it and says so on arrival.

## Why a separate axis

A tool can have clean terms and still be mediocre, or be excellent and careless with your data. Phase
1 answers "is it honest with my data". Phase 2 answers "do real users think it's any good". They stay
visually and structurally separate — never blended into one score.

## Submission & ownership verification

1. The site or tool owner submits the product for listing.
2. They add a small snippet to their site, Search-Console style. It proves control (basic KYC) and
   gives the review bot a defined route to crawl.
3. The bot confirms the live site matches what was claimed — a music site is actually a music site.

**Public crawl only.** The snippet is the only thing added. No account credentials, no API keys, no
backend access — never requested, never used. It is owner-controlled and owner-removable.

This same snippet can verify a submitter's own privacy claims ("we don't train on your data"), since
they are already cooperating. It does **not** extend to Phase 1 providers, who have no reason to
cooperate.

## Tamper detection

- The snippet is re-checked **weekly**, not just at submission.
- If missing or altered, the owner receives a warning stating: what changed (a commit-history-style
  log with timestamps), that a human will review it, what happens if the review finds tampering, and
  how to contact support.
- **No auto-ban on first detection.** Snippet breakage is usually innocent — a redesign, a CMS
  migration, someone tidying the header.

## Hard rules (same category as the one rule)

- Review turnaround is never purchasable or expeditable.
- Ranking position and upvote counts are never purchasable, boostable, or influenced by payment.
- Upvote score and ToS transparency rating are shown as separate, clearly labelled signals — never
  one combined score.

## Anti-gaming

- Account age requirement plus captcha on voting.
- Upvotes decay daily, so a one-off bot pile-on cannot have a permanent effect.
- Submitters may run a promotion or vote campaign once per week, preventing repeated brigading.

## ADUO — balance-of-performance boost

Named after F1-style performance balancing. A listing with few upvotes but strong underlying signals
gets extra visibility, so good undiscovered tools are not permanently buried under incumbents who won
early and snowballed on raw vote count.

### Proposed thresholds — UNRATIFIED

| Signal | Proposed threshold | Note |
|---|---|---|
| Traffic trend | ≥ 15% MoM growth over 3 months from ≥ 1,000 monthly visits | Only usable once a footprint exists |
| External reviews | ≥ 10 off-site reviews, median sentiment ≥ 4/5, ≥ 3 substantive | Substance over volume; app stores and forums, not the tool's own site |
| ToS / privacy score | ≥ 60/100 with coverage ≥ 70% | Drawn from Phase 1 data. An unverified row cannot qualify |
| Upvote ceiling | < 50 upvotes | Above this, presumed able to compete on votes alone |

These are **proposed, not decided**. They must be ratified before the first grant — deciding the bar
once you can see who clears it turns a rule into a favour.

### Rules

- **Open application.** Any submitter can apply, including big names, evaluated against the same fixed
  criteria. Never granted because a company is liked or wanted on the site.
- **Low upvotes alone is never sufficient.** A bad tool also has low upvotes. Traffic, reviews and the
  ToS score are what separate "good, undiscovered" from "correctly ignored".
- **Deliberate, disclosed exception** to "ranking is never influenced outside votes" — visibly labelled
  on the listing itself, never invisible.
- **Founder-granted, criteria-bound.** The founder applies the fixed criteria; this is not a licence to
  override them with personal judgement.

### Known gap

Traffic data is least reliable for exactly the earliest-stage tools ADUO is meant to help — they have
no measurable footprint yet. For very early submissions, evaluate on reviews plus ToS score alone and
add traffic once it exists. Otherwise ADUO structurally cannot fire for the smallest, newest
submissions.

## Open questions

- How to detect upvote manipulation beyond the measures above (bot rings, coordinated voting).
- What "verified" actually confirms, and how to say it so users don't read it as a quality or safety
  endorsement.
- Cadence and cost of snippet re-checks at scale — trivial at 20 listings, a real recurring job at
  2,000.
- What "contact support" operationally means. Early on: the founder's inbox. Say so plainly.
