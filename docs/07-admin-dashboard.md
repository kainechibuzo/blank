# Admin dashboard (`/admin`)

## Why it exists

The roadmap says the weekly snippet check **flags but never punishes** — "a human reviews before
anything is removed". Until now that human step lived in a GitHub issue. This is where it belongs:
the bot defers, a person decides, and the decision is recorded.

It is founder-only, gated twice: the page refuses to render without the `founder` role, and the
`admin_vote_signals()` function refuses to run for anyone else. Knowing the URL is not access.

## Becoming a founder

Roles are not settable from the interface — that would let anyone make themselves one. Run this once
in the Supabase SQL editor:

```sql
update public.profiles
   set role = 'founder'
 where email = 'you@example.org';
```

The `/admin` page prints this query with your own address filled in, for exactly this reason.

## What it does

| Section | Purpose |
|---|---|
| Review queue | Listings the weekly check flagged, with their check log and the warning the owner received. Decide: keep listed, or delist. |
| Awaiting verification | Submissions that have not confirmed their tag yet. Re-check on demand. |
| Listed and delisted | Everything else, with its current decision and a relist action. |
| Vote oversight | Counts, votes in the last 24 hours, votes from under-age accounts, and days spanned. |
| Dataset overview | Read-only: tools tracked, verified count, draft count, unknown answers. |
| Audit log | Every decision: who, what, why, when. |

**The review queue shows the check log, not just the verdict.** A tag that vanished is usually a
redesign, a CMS migration, or a caching layer that strips `<head>` tags. Reading six timestamped
lines before deciding is the difference between a careful site and a careless one.

## What it cannot do

**It cannot change a transparency score, a ranking, or a provider row.** Those come from a human
reading a linked policy on a recorded date, and that workflow lives in code and review — with a
reviewer name and a date attached — not in a dashboard toggle. A check fails the build if the page
ever gains a write path to provider data, and the limitation is stated on the page itself, not buried
in documentation.

**It cannot grant ADUO.** Stage 3 is unbuilt and the thresholds are unratified; they have to be
ratified *before* the first grant, not after, or the rule becomes a favour. When Stage 3 is built, the
grant belongs here — as a manual, reasoned, logged founder action — and not before.

**It cannot see who voted.** Vote oversight returns aggregates: totals, last 24 hours, votes from
under-age accounts, days spanned. Not identities. A founder deciding whether a listing was brigaded
needs shape and timing, not a list of people.

## Every decision needs a reason

An action submitted without a reason is rejected before anything is written. Reasons are not
ceremony: they are the difference between a moderation log that explains itself and one that future
you has to reverse-engineer.

Each decision appends to `admin_actions`: actor, actor email, listing, action, reason, timestamp.
Updates and deletes are revoked at the database level — **an audit log you can edit is not an audit
log, it is a story you can revise.**

Delisting is public. The reason is shown on the listing, because a removal nobody can explain reads
as arbitrary.

## Deliberately absent

- **Bulk actions.** Every listing gets looked at. Mass delisting is how a careful process becomes a
  careless one.
- **Editing a submission on someone's behalf.** The owner has 24 hours; after that it goes through
  support by email, which leaves a trail.
- **Anything sponsorship-shaped.** No boosting, featuring, or ordering controls exist here, or
  anywhere else. Money touches `/sponsors` and nothing else.
