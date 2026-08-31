# Phase 2 — directory, verification & ADUO

## Status

| Piece | State |
|---|---|
| Accounts (email/password + Google) | **Live** — Supabase Auth |
| 24-hour edit window + re-verification | **Live** |
| Duplicate-submission prevention | **Live** — one submission per site, per account |
| Directory submission + snippet issuance | **Live** — `/directory/submit` |
| On-demand ownership verification | **Live** — `verify-snippet` Edge Function |
| Weekly snippet re-check + tamper warning | **Live** — `scripts/check-directory-snippets.mjs`, Thursdays 07:23 UTC |
| `/directory` listing page | **Live** — shows confirmed submissions only |
| Upvoting + anti-gaming | **Live** — see below |
| ADUO | **Mechanism live** (Stage 3). Thresholds below are **UNRATIFIED** and no grant is automatic. |

Everything live here is inert until a Supabase project is configured. With no env
vars the app still builds and every route renders; the directory explains what is
missing rather than pretending.

## Why a separate axis

A tool can have clean terms and still be mediocre, or be excellent and careless with your data. Phase 1
answers "is it honest with my data". Phase 2 answers "do real users vouch for it". They stay visually
and structurally separate — never blended into one score.

That separation is enforced, not promised:

- the ranking path (`scoring.js`, `filters.js`, `chat.js`) is checked to contain no reference to
  Supabase or the directory tables;
- provider rows are scanned for forbidden fields including `upvotes`, `aduo`, `traffic`,
  `review_sentiment`, `campaign`;
- the directory tables live in a different database from the provider dataset, which is a static
  module imported by the app.

## Submission & ownership verification

1. A signed-in user submits the product and states what it is, in their own words.
2. A unique token is issued and shown once, as one static meta tag:

   ```html
   <meta name="wt-directory-verify" content="wt_verify_…">
   ```

3. "Verify now" fetches the public homepage once and looks for that tag. Match → the listing is
   confirmed and goes public. No match → it stays pending, with no warning (a draft is not an
   offence).

**Public crawl only.** The snippet is the only thing added. No account credentials, no API keys, no
backend access — never requested, never used. It is owner-controlled and owner-removable. A
traceability check asserts `src/lib/snippet.js` contains no auth, cookie, key or login handling.

The submitter's own claim ("a music discovery site") is recorded so the review can confirm the live
site matches what was claimed at submission.

## Fixing a mistake

Submission has a **24-hour editing window**. Within it the owner can correct the name, URL, category
and the description of what the site is. After it, changes go through support by email.

Why a window at all:

- Refusing to let someone fix a typo forever is hostile.
- Letting a *listed* entry be edited indefinitely would let it quietly become something different from
  what was verified.

Twenty-four hours is the compromise, and it is enforced in the database rather than by hiding a
button: the update policy is `now() < editable_until`, and a trigger resets `editable_until` to its
original value on every update, so the window cannot be extended — not by the owner, not by a
founder, not by the weekly job. The UI constant is cross-checked against the SQL, so the sentence
shown to a submitter cannot promise a window the database does not honour.

**Changing the URL sends the listing back to pending.** It has to — the old verification proves
control of the old address. A submitter may downgrade their own listing to pending inside the window;
nobody can promote it except the bot, on a successful check.

The controls appear on both `/account` and `/directory`, and both render the same
`SubmissionList` component — a check fails the build if they ever diverge, because an edit button that
exists on one page and not the other is a bug that had already happened once.

**Re-checking is never time-boxed.** "Re-check snippet" stays available after the window closes.
Verification is not a one-shot favour granted at submission, and someone who left the page mid-setup
should not be stuck.

Verification state itself can never be set by hand — `snippet_state` is written only by the bot, so
an owner cannot mark their own tag "ok" and skip the crawl.

## Duplicate submissions

One submission per site, per account. Without that rule, a submitter whose first attempt appeared to
do nothing — usually because the verification function was not deployed yet — could pile up copies of
the same claim, and the directory fills with duplicates.

- every listing carries a `site_key`: host + path, lowercased, with scheme, `www.`, query string and
  trailing slash stripped. `https://Example.com/` and `http://www.example.com/?utm=x` are the same site
- a unique index on `(owner_id, site_key)` makes the duplicate impossible at the database level, not
  just hard to do in the interface
- the form checks first and says so: *"You have already submitted this site"*, with a link to the
  existing submission
- the normalisation rules exist twice — `src/lib/sites.js` and `public.site_key_of()` in the database —
  and a check fails the build if either disappears

Two **different** accounts claiming the same site is allowed, because a constraint cannot decide who is
right. Only one of them can actually place the verification tag, so the other simply never verifies.
`/admin` lists these as duplicate claims for a person to resolve.

## Tamper detection

- The snippet is re-checked **weekly** (Thursdays 07:23 UTC), not just at submission.
- Each check appends an immutable row to `snippet_checks`: timestamp, outcome, HTTP status, expected
  token, found token, note. That table is the commit-history-style log, and it is append-only.
- Outcomes: `ok`, `altered` (a tag exists but its content differs), `missing`, `unreachable`.
- If a **previously confirmed** listing stops confirming, the bot flags it (`review_required`) and
  writes the warning below. A pending listing is never warned about — it simply has not got there yet.

### No auto-ban

The bot sets flags. It does not delist, hide, ban, or penalise anything. This is enforced three ways:

1. the script contains no removal write, and a check scans it for one;
2. `guard_listing_status` in the database raises unless the change is made by a founder (or by the
   service role promoting a verified listing);
3. the weekly workflow opens a GitHub issue as the human review queue, and says in the issue body that
   nothing has been delisted.

Snippet breakage is usually innocent — a redesign, a CMS migration, a caching layer that strips
`<head>` tags.

### The warning

Generated by `src/lib/snippet-warning.js` and published in full on `/directory`, because a warning
users cannot see is a warning that can quietly get worse later. It always contains four parts, and a
traceability check fails the build if any is dropped:

1. **What changed** — the recent check log, newest first.
2. **What happens next** — a human reviews; nothing is automatic.
3. **What removal would mean** — only if the review finds deliberate tampering, and it is a founder
   decision recorded publicly.
4. **How to contact support** — a real route and a stated response window.

## Hard rules (same category as the one rule)

- Review turnaround is never purchasable or expeditable.
- Ranking position and upvote counts are never purchasable, boostable, or influenced by payment.
- Upvote score and ToS transparency rating are shown as separate, clearly labelled signals — never
  one combined score.

## Voting

Two buttons, one per account: **vouch for it** (+1) or **disapprove** (−1). There is no neutral
option; an abstention is a row you do not insert.

The number displayed is **not** a raw count. Each vote's weight decays:

```
weight = value × 0.9 ^ age_in_days,   for up to 90 days, then 0
```

| age | weight of one upvote |
|---|---|
| today | 1.00 |
| 7 days | 0.48 |
| 14 days | 0.23 |
| 30 days | 0.04 |

A 20-vote pile-on today is worth 4.6 in a fortnight and 0.85 in a month. A tool gaining one genuine
vote a day for thirty days holds about 9.6. That asymmetry is the point: bursts fade, steady support
accumulates. 90 days is the same shelf life the project already uses for a verified policy reading.

Raw counts are shown next to the decayed score (`12 up · 3 down`), so a visitor can tell "many people
voted" from "the votes are recent".

**The upvote score is separate from the transparency score.** Different database, different
computation, never added together. A tool can be honest with your data and unvouched-for, or widely
liked and careless. The directory page says so above the listings, and a traceability check fails the
build if the ranking path ever reads the votes table.

## Anti-gaming, as built

Every rule below is enforced in Postgres, not in the browser. A client-side check is a suggestion; a
row level security policy is a wall.

- **One vote per account** — the primary key on `votes (listing_id, voter_id)`. A second attempt is a
  conflict, not a second vote.
- **Account age minimum: 14 days** — enforced both in the insert policy and in `vote_eligibility()`,
  which returns the reason in words the UI shows verbatim. Derived from `auth.users.created_at`, which
  a user cannot forge.
- **Captcha: hCaptcha**, verified server-side against `siteverify` inside the `cast-vote` Edge
  Function. The secret is a function secret; a check fails the build if any browser code reads it.
  Until it is configured, voting works and the directory says captcha is off.
- **Daily decay: 10% per day**, applied in `vote_weight()` at read time. No stored running total that
  could drift or be edited.
- **One promotion campaign per submitter per week** — a unique index on `(created_by, week_start)`.
  Campaigns are public: if a listing is being promoted this week, that is shown on its card.
  Retraction is deliberately not exposed in the UI — a campaign that could be quietly withdrawn after
  the votes land is a campaign with no cost.

Votes are written only through `cast-vote`, which checks identity, captcha, account age and listing
status on a machine the voter does not control. The policies behind it are a second wall.

The UI constants (`VOTE_MIN_ACCOUNT_AGE_DAYS`, `VOTE_DECAY_PER_DAY`) are cross-checked against the SQL
that enforces them, so the page can never describe one site while the database runs another.

## ADUO — balance-of-performance boost

Named after F1-style performance balancing. A listing with few upvotes but strong underlying signals
gets extra visibility, so good undiscovered tools are not permanently buried under incumbents who won
early and snowballed on raw vote count.

### Proposed thresholds — UNRATIFIED

| Signal | Proposed threshold | Checked by |
|---|---|---|
| Traffic trend | ≥ 15% MoM growth over 3 months from ≥ 1,000 monthly visits | **A human**, from evidence the applicant supplies |
| External reviews | ≥ 10 off-site reviews, median sentiment ≥ 4/5, ≥ 3 substantive | **A human**, from evidence the applicant supplies |
| ToS / privacy score | ≥ 60/100 with coverage ≥ 70%, and the row must be verified | **The machine** |
| Upvote ceiling | Decayed score < 50 | **The machine** |

These are **proposed, not decided**. They must be ratified **before** the first grant, not after:
deciding the bar once you can see who clears it turns a rule into a favour. The mechanism marks them
unratified everywhere they appear, and every grant records that it was made against unratified
thresholds — so if they move later, history says which decisions need revisiting.

### How a grant actually happens

1. An owner applies from their own **listed** submission, supplying whatever evidence they have for
   traffic and reviews.
2. `/admin` shows the application with all four criteria: the two machine-checked ones with their
   actual numbers, the two human ones as attestations the founder has to tick *after* reading the
   evidence.
3. The founder grants or declines, with a written reason. The decision, the numbers at the time, and
   whether the thresholds were ratified are all stored on the application and written to the audit
   log.

**Nothing is automatic.** Crossing the thresholds does not grant anything; waiting does not grant
anything. The Grant button is disabled unless the two machine checks pass, both human checks are
attested, and a reason is written — ADUO is criteria-bound, not discretionary.

Two of the four criteria cannot be computed here, and that is stated rather than faked: this site runs
no analytics and has no review provider. Inventing a traffic number would be worse than admitting it
is unknown. Those two come from evidence a person verifies.

### What the boost does, and what it cannot

A granted listing is shown **above** the others in the directory, badged `ADUO boost`, because the
whole point is visibility a low-vote listing could not otherwise get. That is the only effect. It
never enters a transparency score, never reorders `/compare`, and never influences a chat
recommendation — the ranking path is checked to contain no reference to ADUO at all.

### Rules

- **Open application.** Any submitter can apply, including big names, evaluated against the same fixed
  criteria. Never granted because a company is liked or wanted on the site.
- **Low upvotes alone is never sufficient.** A bad tool also has low upvotes. Traffic, reviews and the
  ToS score are what separate "good, undiscovered" from "correctly ignored".
- **Deliberate, disclosed exception** to "ranking is never influenced outside votes" — visibly
  labelled on the listing itself, never invisible.
- **Founder-granted, criteria-bound.** The founder applies the fixed criteria; this is not a licence to
  override them with personal judgement.

### Known gap

Traffic data is least reliable for exactly the earliest-stage tools ADUO is meant to help — they have
no measurable footprint yet. For very early submissions, evaluate on reviews plus ToS score alone and
add traffic once it exists. Otherwise ADUO structurally cannot fire for the smallest, newest
submissions.

## Open questions

- How to detect upvote manipulation beyond the measures above (bot rings, coordinated voting).
- **Can you vote on your own submission?** The roadmap does not say, and the current build allows it —
  one vote per account, the same as anyone else. Blocking it would be stricter but was not asked for.
  Needs a decision.
- Is a disapproval (−1) the right second button? It can be used to bury a competitor, and the decay
  makes sustained burying cheap to sustain at low volume.
- What "verified" confirms to a reader: control of a domain, and that the site matches its claim. Not
  quality, not safety. The wording has to make that impossible to misread.
- Cost of snippet re-checks at scale — trivial at 20 listings, a real recurring job at 2,000.
- What "contact support" operationally means. Early on: the founder's inbox. Say so plainly.
