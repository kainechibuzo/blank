# Field states

What a single tracked fact can be in, what the interface says when it is in that
state, and whether it counts as progress.

This file is the contract for Phase 4. Every component composes from
`<FieldState />`, and `<FieldState />` has exactly five cases plus two row-level
roll-ups. If a component assumes a field is populated, it is wrong, because two
of the five states are precisely "it is not".

---

## The five states

A state describes **one field on one tool**. `partially-verified` is not a field
state — it is what a row says when its fields are in a mixture.

### 1. `verified`

A person read the linked page on the recorded date and the value is a paraphrase
of what that page states. Carries a source URL and a date.

| | |
| --- | --- |
| **Renders** | `Read 2 Sep 2026` + a link to the page |
| **Glyph** | ✓ — solid check |
| **Style** | solid ink glyph, neutral. No green. |
| **Counts as read** | yes |
| **Counts as answered** | yes |

### 2. `unknown`

The page **was** read and it does not address this field. This is a real answer,
not a placeholder for work we have not done. Perplexity's training policy is the
canonical example: the notice simply does not say, and the honest value is a
blank, not a guess.

It still carries a source and a date — we can prove we looked, and where.

| | |
| --- | --- |
| **Renders** | `Not stated in the policy` + a link to the page |
| **Glyph** | — em dash |
| **Style** | hollow/neutral. Distinct shape from `not read yet`, because "they don't say" and "we didn't look" are different facts. |
| **Counts as read** | **yes** |
| **Counts as answered** | no |

### 3. `not read yet`

No fetch, no reading, nothing. The field has whatever the seeded dataset carried
and no one has checked it. This is the majority of the database today.

| | |
| --- | --- |
| **Renders** | `Not read yet` — no link, because there is nothing to link to |
| **Glyph** | ○ open circle |
| **Style** | dashed outline, lighter weight. Must never be mistakable for `unknown`. |
| **Counts as read** | **no** |
| **Counts as answered** | no |

### 4. `stale`

Was `verified`, then the watchdog saw the page change, and nobody has re-read it
since. The value is still shown because it was true once, and it is labelled as
no longer confirmed.

| | |
| --- | --- |
| **Renders** | `Read 1 Jun 2026 — page changed 14 Aug, needs re-read` |
| **Glyph** | ↻ |
| **Style** | neutral, with the previous date still legible. Degrades from verified, never from unknown. |
| **Counts as read** | yes (it was read; the reading is out of date) |
| **Counts as answered** | yes, but the score it feeds is marked provisional |

> **Open — flagged in Phase 1, not fixed here.** `stale` is declared in
> `src/data/schema.js` but **no code path can currently set it**. The weekly
> policy observer opens a GitHub issue; it never writes to the dataset, by
> design. So until something closes that loop, `stale` is unreachable and the
> fourth state exists only on paper. Options: (a) have the observer open a PR
> flipping the row to `stale`, (b) have a human flip it during review, (c) drop
> the state. Needs a decision before Phase 4, because it changes what
> `<FieldState />` has to render.

### 5. `disputed`

A credible correction is under assessment. The row stays visible and flagged.

| | |
| --- | --- |
| **Renders** | `Disputed — correction under review` |
| **Glyph** | ⚠ |
| **Style** | neutral |
| **Counts as read** | yes |
| **Counts as answered** | yes |

---

## Two row-level roll-ups

### `partially-verified`

Some fields read, some not. **Always renders as the literal fraction** —
`4/7 fields read` — never as the bare word "partially-verified" next to a score.
A single adjective beside a number is exactly the collapsed confidence the
metric exists to prevent.

### Where `observed` goes

The policy observer's state (`observed` — a script fetched the page, no human
read it) is **not** a sixth display state. It renders as `not read yet`, because
from the reader's point of view the position is identical: no person has
confirmed this. The fetch is recorded in `data/policy-hashes.json` and surfaces
in `/admin`, not on a public field.

---

## Counting: the one thing I need signed off

There are two different questions, and today the site only asks one:

| metric | question | counts `unknown`? | counts `not read yet`? |
| --- | --- | --- | --- |
| **Read** | how much of this row have we actually looked at? | **yes** | no |
| **Answered** | how much does the policy actually tell us? | no | no |

`src/lib/scoring.js` currently computes only the second and calls it Coverage:
`answered / 7`, where `unknown` is not answered. So today, Perplexity reads
`score 16 · coverage 43%`.

You asked for `unknown` to count toward Coverage. It is the right instinct — a
row we have read and found silent is genuinely further along than a row nobody
has opened — but folding it in has a cost worth naming:

- **If Coverage = Read**, Perplexity shows `57%` and the number stops
  distinguishing *"the policy is silent"* from *"we haven't looked"*. That
  distinction is currently the site's answer to "is this provider bad, or is
  this row incomplete?" — coverage is what stops a low score from reading as a
  verdict.
- **If the two stay separate**, the card shows both: `16 pts · 4/7 read · 3/7
  answered`. More numbers, but each one means something and neither can be
  mistaken for the other.

**My recommendation: keep both, and show both.** Read answers "do we know?",
Answered answers "does the policy say?". One number cannot answer both, and
collapsing them is how a transparency product ends up laundering silence as
progress. If you want one number, I will fold them and Coverage becomes Read —
say so and I will.

---

## Rules that apply to all five

- **Colour never carries the meaning.** Shape does. No field is red or green
  because a provider is bad or good; that is what the score is for, and mixing
  the two makes a low score look like a warning and a high score look like an
  endorsement.
- **Every state that came from a page links to that page.** Only `not read yet`
  has no link, and the absence is itself the signal.
- **A fraction is a fraction.** Anywhere a row is partially read, the interface
  shows `n/7`, not an adjective.
- **`unknown` is a sentence, not a shrug.** It renders as "Not stated in the
  policy" — an assertion about the page — never as "Unknown" alone, which reads
  as "we don't know" and is not the same claim.
