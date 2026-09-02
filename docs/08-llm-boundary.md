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

## Still open

Whether the parse calls a model at all on launch. A keyword match over filter
ids would cover most real queries, costs nothing, and can run offline. The
model earns its place only if it measurably beats that on real queries — which
is a Phase 4 question, not a Phase 1 one.
