# Field states

What a single tracked fact can be in, what the interface says when it is in that
state, and whether it counts as progress.

This file is the contract for Phase 4. Every component composes from
`<FieldState />`, and `<FieldState />` has exactly four cases plus one row-level
roll-up. If a component assumes a field is populated, it is wrong, because two
of the four states are precisely "it is not".

**Signed off 2 Sep 2026.** Two decisions are recorded in this file:
`stale` is dropped (four states, not five), and Coverage is reported as two
fractions rather than one number.

---

## The four states

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

### 4. `disputed`

A credible correction is under assessment. The row stays visible and flagged.

| | |
| --- | --- |
| **Renders** | `Disputed — correction under review` |
| **Glyph** | ⚠ |
| **Style** | neutral |
| **Counts as read** | yes |
| **Counts as answered** | yes |

---

## Dropped: `stale`

**Decision: not a state.** It was going to be "was verified, then the page
changed". It is dropped for three reasons:

- Nothing can set it. The weekly observer opens an issue and, by design, never
  writes to the dataset. A state that no code path can produce is not a state.
- Age already says it. A `verified` field carries the date it was read, and the
  shelf-life rules already act on that date (re-read at 90 days, amber past 60,
  red past 120). "Verified on 1 Jun, page changed in August" and "verified on
  1 Jun" are the same fact once the date is visible.
- Two mechanisms for one idea guarantees they disagree.

So freshness is a property of the date on a `verified` field, not a fifth state.
`<FieldState />` has four cases.

> Follow-up for Phase 5: `stale` remains declared in `src/data/schema.js` and
> referenced in `src/lib/traceability.js`. With the state dropped it should be
> removed from both, so nothing can render a case the taxonomy does not have.

---

## One row-level roll-up

### `partially-verified`

Some fields read, some not. **Always renders as the literal fraction** —
`4/7 fields read` — never as the bare word "partially-verified" next to a score.
A single adjective beside a number is exactly the collapsed confidence the
metric exists to prevent.

### Where `observed` goes

The policy observer's state (`observed` — a script fetched the page, no human
read it) is **not** a fifth display state. It renders as `not read yet`, because
from the reader's point of view the position is identical: no person has
confirmed this. The fetch is recorded in `data/policy-hashes.json` and surfaces
in `/admin`, not on a public field.

---

## Counting: two fractions, both shown

**Decision: report both.** They answer different questions and one number cannot
do both.

| metric | question | counts `unknown`? | counts `not read yet`? |
| --- | --- | --- | --- |
| **Read** | how much of this row have we actually looked at? | **yes** | no |
| **Answered** | how much does the policy actually tell us? | no | no |

Every card, table row and detail header shows both, as fractions rather than
percentages, because a fraction says what it is counting:

```
16 pts        4/7 read        3/7 answered
```

A row we have read and found silent scores low on both the score and
*answered*, but full marks on *read* — which is the difference between "this
provider is opaque" and "we haven't finished". Collapsing them would let a
half-read row look like a half-answered one, and that is precisely the
laundering this product exists to prevent.

- `verified`, `unknown`, `disputed` count as read.
- `verified`, `disputed` count as answered; `unknown` does not.
- `not read yet` counts as neither.

The existing `coverage` figure in `src/lib/scoring.js` is *answered*. Phase 3
adds *read* alongside it and Phase 4 renders both.

---

## Rules that apply to all four

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
