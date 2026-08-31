# Phase 3 — AI-guided discovery

## Hard rule

> Chat recommendations must be a personalised *view* into the same underlying scored data shown on the
> public comparison page — never an independent judgement the AI forms fresh in conversation.

A recommendation that cannot be traced back to the public score and explanation page creates a second,
unaccountable ranking running parallel to the honest one. Not allowed.

## How it is enforced in this codebase

1. **One ranking function.** `rankTools()` in `src/lib/filters.js` is the only path to an ordered list.
   `/compare` and `/discover` both call it.
2. **No model in the ranking path.** `src/lib/chat.js` is a deterministic parser: text → filter ids →
   `rankTools`. The same words always produce the same filters and the same order, for every user.
3. **Provenance on every answer.** Each chat result renders a traceability panel: the exact filters
   applied, the ranking function name, a stable set signature, and a link that opens the identical
   result set on `/compare`.
4. **Rule checks run live** (`npm run check:traceability`, also shown on `/discover`):

   - chat results never outrank or reorder the public comparison
   - parsing and ranking are deterministic
   - chat may only reference declared comparison filters
   - scores are computed from field values, never stored
   - an all-unknown row scores zero, not average
   - no fabricated verification dates
   - community signal is not blended into the transparency score
   - no sponsorship/boost fields exist in the dataset

## If an LLM is added later

Its only permitted job is **parsing the user's words into filters**. It must not score, re-rank, or
generate recommendations. Concretely:

- The model returns filter ids from `FILTERS`, or nothing.
- Ranking still comes from `rankTools`.
- Every response still renders the traceability panel and the `/compare` link.
- Rate limiting before launch — this is the one cost that scales with usage.

## Post-click review prompt (browser-side only)

Planned, not built. When built, the constraints are:

- Recommendation links open in the site's own extension/popup wrapper.
- A small upvote/disapprove button that is **entirely browser-side UI** — not injected into, and not
  reading, logging or interacting with, the third-party site's code.
- A lightweight prompt, not surveillance. No monitoring of user behaviour inside the third-party tool.
- Feeds the review-sentiment signal used for ADUO scoring and the public comparison data.
