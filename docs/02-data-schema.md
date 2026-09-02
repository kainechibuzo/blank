# Data schema

Eight fields per tool. Not nine. Scope discipline is a feature: every extra field is permanent
verification labour, and verification labour is the actual cost of this business.

Source of truth: `src/data/schema.js` (definitions, options, filters) and `src/data/tools.js` (rows).

## The seven fields

| Field | Answers | Scored |
|---|---|---|
| `trains_on_data` | Is what I type used to make the model better? | 25 |
| `human_review` | Can a person read what I wrote, and when? | 20 |
| `retention` | How long does it sit there? | 15 |
| `deletion` | Can I actually get rid of it, and how? | 15 |
| `residency` | Where does it live, who has jurisdiction? | 10 |
| `free_tier` | Is the free version held to the same rules? | 10 |
| `enterprise_api` | Is there a separate, usually stricter policy? | 5 |

`residency` is structural rather than a single enum:

```js
residency: { hq_jurisdiction: 'US', eu_option: true, regions: ['US', 'EU'], note: '…' }
```

## Per-row shape

```js
{
  id, name, vendor, category, hq, url, blurb, monogram, accent,
  fields: { trains_on_data: { value, note }, … },
  verification: { status, last_verified, reviewer, method },
  policy_sources: [{ label, url, last_hash, last_checked }],
  community_signal: null,   // Phase 2 axis — null on purpose
}
```

### Verification statuses

| Status | Meaning |
|---|---|
| `draft-unverified` | Entered to exercise the schema. No human has read the policy. Not publishable. |
| `verified` | Read by a named human on the recorded date. |
| `stale` | Previously verified, but the policy changed or the review aged out. |
| `disputed` | A credible correction is being assessed. Shown, flagged, until resolved. |

**`last_verified` must be null unless status is `verified`.** A traceability check fails the build on
any fabricated date.

## Two numbers, always together

- **Transparency score (0–100)** — how good the answers are, where known. Unknown scores zero, so a
  blank row can never look good.
- **Coverage (%)** — how much of the row is answered. A high score on a thin row is not a good tool,
  it is an unfinished reading.

Unknown is not treated as a bad act (silence ≠ wrongdoing), which is exactly why coverage sits beside
every score instead of being folded into it.

Fixed, public weights: training 25, human review 20, deletion 15, retention 15, residency 10, tier
parity 10, enterprise terms 5. Bands: Strong ≥ 75, Mixed ≥ 55, Weak below.

## Fields deliberately not tracked

- **Product quality.** Separate axis (Phase 2). Never blended.
- **"Does it have feature X."** Out of scope; this is a data-practices database.
- **Third-party model terms for aggregators.** Poe-style tools have two layers — the platform's terms
  and each underlying provider's. The current schema records one row, which is a known limitation
  noted on the tool page itself.
- **Developer API eligibility by country/status** ("can I use this API as a student in Nigeria").
  Real idea, different schema, different audience, separate product if ever.
