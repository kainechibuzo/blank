# The LLM boundary

Decided 2 Sept 2026, ahead of the Phase 4 build. Recorded so it is not
re-argued from memory when the component is written.

## The rule

An LLM may help a user express what they want. It may never help us decide
what to show them.

```
user types free text
  → LLM extracts filter intent      ← input parsing. LLM allowed here.
  → filter chips rendered, editable
  → planQuery matches and ranks     ← deterministic. No LLM here, ever.
  → results rendered
```

## Why the line falls where it does

Input parsing is translation: the user said "I don't want my stuff used for
training" and we need to know that means `no_training`. Getting that wrong is
recoverable, because the chips are shown and each one is editable — the user
sees the translation and corrects it.

Ranking is judgement. If a model decides which tools appear and in what order,
the ordering is no longer reproducible from public data, and we can no longer
say what put a tool at the top. That is the whole product.

## What this supersedes

The rebuild spec's Phase 4 note — *"send user query + full dataset to
GPT-4o-mini in one prompt, < $0.01 per search"* — was written before this
constraint existed. **Disregarded.** The dataset is not sent to a model, at any
cost per search.

## Consequences for Phase 4

- The prompt receives the user's text and the list of filter ids. Not the tool
  data.
- If the call fails, is slow, or returns nothing usable, the chips are simply
  empty and the checkboxes still work. The feature degrades to manual filtering
  rather than to guessing.
- The chips must be rendered and individually removable *because* the parse is
  probabilistic. They are not decoration; they are the audit surface.

## A standing copy rule (added 2 Sep 2026)

This file is named for the LLM boundary, and that boundary is the same
principle as this one: **do not claim a capability the system does not have.**
The LLM rule stops us implying a model ranked something when it did not. The
copy rule below stops us implying a setting exists when it does not.

### The rule

> **Never imply a remedy that does not exist.**
>
> "Most people never do" and the "How to opt out" link follow **one condition**,
> and it is value-aware, not field-aware:
>
> `showsOffByDefault(key, state, value)` in `src/lib/plain-english.js`.
>
> Currently only `trains_on_data: opt-out-available` qualifies.

### Why it is value-aware and not field-aware

The first version of this rule was "OPT_OUT_EXISTS and the field is
`trains_on_data` or `human_review`". That shipped a false promise: Claude,
ChatGPT and Le Chat all hold `human_review: conditional`, which means a person
may read a flagged conversation for trust and safety. The generic
OPT_OUT_EXISTS sentence rendered as *"A person may read your chats unless you
turn that off yourself"*, followed by a "How to opt out" link.

There is no such setting. That is a reassuring and false claim about someone's
medical history, and it is the worst sentence this site could publish — worse
than saying nothing, because it makes people feel safe when they are not.

`human_review` now qualifies for **nothing**: no value in that field offers a
switch. The conditional sentence reads *"A person may read your chats in some
situations — for example if something gets flagged. There is nothing to switch
off."*

### The generalisation

Sentences are keyed on **value** before **state** where the two disagree
(`VALUE_SENTENCES` in `plain-english.js`), because the sentence is what a person
actually reads and the state is an internal category. A state that promises
agency must only be grouped, linked and phrased where that agency is real.

### It will come back

This rule will be tested the first time someone writes marketing copy for this
site, or adds a field, or maps a new value to `OPT_OUT_EXISTS` because it looked
close enough. Re-read this section before doing any of those.

---

## The parse step today (recorded 2 Sep 2026)

**The parse step currently uses `planQuery` — a keyword lexicon, no model.**

A model is permitted here under the boundary above, and is not required. The
lexicon was chosen because it costs nothing, runs offline, needs no key to
rotate, and adds no outbound call to audit — and because it can name the phrase
behind every chip, which is what the "check its working" promise actually asks
for.

### The constraint that survives a swap

> **Every chip must name the phrase that derived it.**
>
> This applies regardless of whether a model or a lexicon does the parsing.

That requirement is the reason the parse step is bounded at all. If a model
replaces the lexicon and cannot say which words produced which filter, the
feature has got worse while getting more expensive: the audit surface is the
product, and a parse that cannot show its reasoning is not a parse this site
can use.

Everything downstream of the parse sees only filter ids. Swapping the lexicon
for a model is therefore a local change to one function, provided the new one
returns the matched phrases with the same honesty `planQuery` does today.
