# Open questions & running costs

## Open questions, unresolved on purpose

| Question | Current position |
|---|---|
| Who verifies accuracy, and how often? | Founder reads every policy in Phase 1. 90-day target re-read, hard trigger on hash change. Unresolved: what happens when tool count makes one person the bottleneck. |
| Legal exposure of interpreting ToS language | Mitigation is paraphrase-only: describe the effect, never reproduce the clause, never present an interpretation as advice. Every row links to its source. Unresolved: whether a disclaimer suffices everywhere, and whether provider pushback needs a standing corrections process (it does). |
| Are "last verified" dates enough at launch, or are alerts needed day one? | Dates ship first — free and honest. Alerts need email infrastructure and sending reputation, so they follow. The browser-local watchlist on each tool page is the interim version. |
| What does "unknown" actually mean? | Three situations collapse into one word: policy is silent, policy is ambiguous, or nobody has read it. Splitting these is a schema decision worth making before the first verified row ships. |
| Upvote manipulation beyond captchas and decay | Not solved. Bot rings and coordinated voting need a real answer before the directory opens. |
| What "verified" confirms to a reader | Control of a domain, and that the site matches its claim. Not quality, not safety. Wording must make that impossible to misread. |
| Snippet re-check cost at scale | Trivial at 20 listings; a real recurring job at 2,000. |
| What "contact support" means | The founder's inbox, early on. Say so rather than dressing it up. |

## Running cost (Phase 1 scale)

| Item | Cost | Note |
|---|---|---|
| Hosting + DB | $20–50/mo | Static-hostable today; a database only when alerts and accounts land |
| Domain | ~$15/yr | — |
| Initial extraction, 20 tools | $10–30 one-off | LLM-assisted, human-verified before publishing |
| Ongoing freshness | ~$0 + founder time | Weekly hash checks; only changed pages trigger re-extraction |
| Chat discovery | variable | Deterministic parsing costs nothing; an LLM parser scales with usage and needs rate limits |
| ADUO review | scales with submissions | Not with users |
| **The real cost** | **founder hours** | Reading policies and reviewing ADUO applications. No infrastructure removes this. |

## Launch checklist before publishing a single verified row

- [ ] Ratify ADUO thresholds (before the first grant, not after).
- [ ] Decide the "unknown" split (silent vs ambiguous vs unread).
- [ ] Name the reviewer role publicly, with the correction route.
- [ ] Rate limits on anything that costs money per request.
- [ ] `npm run check` green in CI (traceability + render).
- [ ] A real `last_verified` date on at least the first batch of rows.
- [ ] Pick the name. "[Working Title]" is a placeholder because a name becomes a brand, and a brand is
      a thing people offer to sponsor.
