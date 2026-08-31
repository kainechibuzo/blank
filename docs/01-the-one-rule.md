# The one rule

> Money — sponsorship, partner deals, "we want this company on the site" — can fund a clearly
> separate page. It can never touch which tools get evaluated, how a clause gets summarised, or any
> ranking, badge or boost inside the real comparison.

**Status:** adopted v1.0, 2026-08-31. Adopted before any revenue exists, on purpose. The pressure to
blur this rule arrives with money attached; a rule written under that pressure is not a rule.

---

## Never

| Never | Meaning |
|---|---|
| Which tools get evaluated | Coverage is chosen on relevance to users, not on who asked, paid, or complained. Nobody buys in. Nobody buys out. |
| How a clause gets summarised | Summaries come from the policy and nothing else. No sponsor reviews, suggests, or pre-approves wording — not informally, not once. |
| Ranking position | Order comes from the public score and the user's filters. No promoted slot, no sponsored placement, no paid "also consider". |
| Upvote counts or review turnaround | Phase 2 brings votes and a review queue. Neither is purchasable or expeditable. A payer waits exactly as long as a non-payer. |
| Badges, boosts, "verified partner" marks | No mark inside the honest comparison that can be acquired. "Verified" means a human read the policy — that is all it ever means. |

## Allowed

- A separate, clearly labelled sponsor page that does not feed into, link into, or rank inside the
  comparison.
- Disclosure of who funds the project.
- Ordinary commercial relationships unrelated to the data: hosting, design, tooling.

## Enforced structurally, not by intention

1. The provider dataset has no sponsorship field, and `npm run check:traceability` fails the build if
   one is ever added (it scans for 14 forbidden keys: `sponsored`, `boost`, `promoted`, `partner`,
   `featured`, `placement`, `rankBoost`, …).
2. Sponsors live on their own route with their own data. No component under `/compare`, `/tools` or
   `/discover` imports it.
3. Chat recommendations are produced by the same function as the comparison page
   (`rankTools`), so there is no second, sellable ranking.
4. Transparency score, data coverage and community signal are rendered as separate signals and are
   never summed.

## Corollaries

- **No combined score.** A tool can be honest and mediocre, or excellent and careless. Two signals,
  two labels, never one number.
- **Chat is a view, not an oracle.** A recommendation that cannot be traced back to the public
  comparison page is a bug.
- **ADUO is disclosed, always.** The Phase 2 balance boost is a deliberate, published exception to
  vote-only ranking, labelled on the listing itself and granted against fixed criteria.
- **Verification means one thing.** A human read the linked policy on the recorded date. Not a
  quality mark, not a safety endorsement, not for sale.

## If the line is crossed

Public correction on the affected page, naming what happened and what changed, with the amendment
recorded in this file. Quiet fixes are how trust dies slowly instead of all at once.

## Amendment log

- **v1.0 · 2026-08-31** — adopted. Sponsorship separation, signal separation, chat traceability,
  non-purchasable review turnaround.
- **pending** — ADUO thresholds. Must be ratified *before* the first grant, not after.
