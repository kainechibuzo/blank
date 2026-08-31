-- Phase 2 — upvoting.
--
-- SEPARATION RULE (unchanged, and now load-bearing):
-- the upvote score is a second, separate signal. It is never added to, averaged
-- with, or displayed as part of the Phase 1 transparency score. The two live in
-- different databases: the transparency score is computed in application code
-- from src/data/tools.js, and nothing here is an input to it.
--
-- ANTI-GAMING PARAMETERS, as decided by the founder:
--   minimum account age        14 days
--   daily decay on vote weight 10% per day (weight = 0.9 ^ days, floored at 90)
--   one vote per account       enforced by primary key
--   one campaign per submitter per week, enforced by a unique index
--   captcha                    hCaptcha, verified server-side in cast-vote
--
-- These are enforced in the database, not just the UI. A client-side check is a
-- suggestion; a row level security policy is a wall.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────── votes ──────
-- One row per (listing, voter). The primary key *is* the "one vote per account"
-- rule: a second attempt is a conflict, not a second vote.
create table if not exists public.votes (
  listing_id uuid not null references public.listings (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  -- 1 = vouch for it, -1 = disapprove. No neutral: an abstention is a row you
  -- do not insert.
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (listing_id, voter_id)
);

create index if not exists votes_voter_idx on public.votes (voter_id);

-- ───────────────────────────────────────────────────────────── campaigns ────
-- A promotion campaign is public. If a submitter is drumming up votes this
-- week, a visitor is entitled to see that next to the number.
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  -- Monday of the campaign week; Postgres weeks start on Monday.
  week_start date not null default date_trunc('week', now())::date,
  note text,
  created_at timestamptz not null default now()
);

-- One promotion campaign per submitter per week. Read literally from the
-- roadmap: a submitter gets one push a week, not one per listing.
create unique index if not exists campaigns_one_per_submitter_per_week
  on public.campaigns (created_by, week_start);

create index if not exists campaigns_listing_idx on public.campaigns (listing_id, week_start desc);

-- ────────────────────────────────────────────────────────── the scoring ─────
-- Decayed weight, computed on read. Nothing stores a running total that could
-- drift or be tampered with.
--
--   weight(value, age_days) = value * 0.9 ^ age_days,   for age_days <= 90
--                           = 0,                        after 90 days
--
-- 90 days is the same shelf life the project already uses for a verified policy
-- reading (docs/03). At 10% a day a vote is worth 0.9^90 ≈ 0.00008 by then, so
-- the cutoff mostly stops negligible rows from accumulating.
create or replace function public.vote_weight(p_value smallint, p_created_at timestamptz)
returns numeric
language sql
stable
as $$
  select case
    when (extract(epoch from (now() - p_created_at)) / 86400.0) > 90 then 0::numeric
    else p_value::numeric * power(0.9::numeric, greatest(extract(epoch from (now() - p_created_at)) / 86400.0, 0)::numeric)
  end;
$$;

create or replace function public.upvote_score(p_listing uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(public.vote_weight(v.value, v.created_at)), 0)::numeric
  from public.votes v
  where v.listing_id = p_listing;
$$;

-- Raw counts, undiscounted, so a visitor can see the difference between "many
-- people voted" and "the votes are recent".
create or replace function public.vote_totals(p_listing uuid)
returns table (up bigint, down bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where v.value = 1),
    count(*) filter (where v.value = -1),
    count(*)
  from public.votes v
  where v.listing_id = p_listing;
$$;

-- Why a vote would be refused, in words the UI can show verbatim. Returning the
-- reason from the database means the client cannot invent a friendlier one.
create or replace function public.vote_eligibility(p_listing uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_age numeric;
begin
  if v_uid is null then
    return json_build_object('eligible', false, 'reason', 'Sign in to vote.');
  end if;

  select l.status into v_status from public.listings l where l.id = p_listing;
  if v_status is null then
    return json_build_object('eligible', false, 'reason', 'That listing does not exist.');
  end if;
  if v_status <> 'listed' then
    return json_build_object('eligible', false, 'reason', 'Voting opens once the listing is public.');
  end if;

  select (extract(epoch from (now() - p.created_at)) / 86400.0)
    into v_age
  from public.profiles p
  where p.id = v_uid;

  if v_age is null or v_age < 14 then
    return json_build_object(
      'eligible', false,
      'reason', format('Your account is %s days old. Voting opens at 14 days.', coalesce(floor(v_age)::int, 0))
    );
  end if;

  return json_build_object('eligible', true, 'reason', null);
end;
$$;

-- ───────────────────────────────────────────────────────────────── RLS ──────
alter table public.votes enable row level security;
alter table public.campaigns enable row level security;

-- Who someone voted for is not public; the aggregate is. This keeps a voter from
-- being individually listed while leaving the numbers fully inspectable.
drop policy if exists "voters see their own votes" on public.votes;
create policy "voters see their own votes"
  on public.votes for select
  using (
    voter_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder')
  );

drop policy if exists "eligible accounts may cast one vote" on public.votes;
create policy "eligible accounts may cast one vote"
  on public.votes for insert
  with check (
    voter_id = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'listed')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.created_at <= now() - interval '14 days'
    )
  );

drop policy if exists "voters may change their own vote" on public.votes;
create policy "voters may change their own vote"
  on public.votes for update
  using (voter_id = auth.uid())
  with check (voter_id = auth.uid());

drop policy if exists "voters may retract their own vote" on public.votes;
create policy "voters may retract their own vote"
  on public.votes for delete
  using (voter_id = auth.uid());

-- Campaigns are public: if a listing is being promoted this week, say so.
drop policy if exists "campaigns are public" on public.campaigns;
create policy "campaigns are public"
  on public.campaigns for select
  using (true);

drop policy if exists "submitters may start one campaign a week" on public.campaigns;
create policy "submitters may start one campaign a week"
  on public.campaigns for insert
  with check (created_by = auth.uid());

-- Note: retraction is intentionally not exposed in the UI. A campaign that
-- could be quietly withdrawn after the votes land is a campaign with no cost.

-- ────────────────────────────────────────────────────── batch read path ─────
-- One call for the whole directory, so the page does not fire three requests
-- per listing.
create or replace function public.directory_vote_summary()
returns table (listing_id uuid, upvote_score numeric, up bigint, down bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    coalesce(sum(public.vote_weight(v.value, v.created_at)), 0)::numeric,
    count(*) filter (where v.value = 1),
    count(*) filter (where v.value = -1),
    count(*)
  from public.listings l
  left join public.votes v on v.listing_id = l.id
  where l.status = 'listed'
  group by l.id;
$$;

-- Aggregates are public; individual ballots are not.
grant execute on function public.vote_weight(smallint, timestamptz) to anon, authenticated;
grant execute on function public.upvote_score(uuid) to anon, authenticated;
grant execute on function public.vote_totals(uuid) to anon, authenticated;
grant execute on function public.vote_eligibility(uuid) to anon, authenticated;
grant execute on function public.directory_vote_summary() to anon, authenticated;
