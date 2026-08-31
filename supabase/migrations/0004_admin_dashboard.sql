-- Founder-only administration.
--
-- Two constraints shape this, both from the roadmap:
--
--   1. HUMAN REVIEW FIRST. The weekly snippet check flags; it never punishes.
--      The decision it defers to has to live somewhere, and this is it.
--   2. NO SILENT ADMIN ACTIONS. "Quiet fixes are the mechanism by which trust
--      dies slowly instead of all at once." Every decision records who took it,
--      what they did, and why. A reason is required, not optional.
--
-- What is deliberately NOT here: any way to edit a transparency score, a
-- ranking, or a provider row. Those come from a human reading a linked policy
-- on a recorded date, and the workflow lives in code and review, not in a
-- dashboard toggle.

-- ───────────────────────────────────────────────────── public decisions ─────
-- A delisting is public: the listing page says why it was removed.
alter table public.listings
  add column if not exists admin_decision text;
alter table public.listings
  add column if not exists admin_decision_at timestamptz;

-- ──────────────────────────────────────────────────────── the audit log ─────
create table if not exists public.admin_actions (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  -- Denormalised on purpose: profiles are readable only by their owner, so a
  -- founder cannot join to find out who did what. The log carries the address
  -- itself, recorded at the moment of the action.
  actor_email text,
  listing_id uuid references public.listings (id) on delete set null,
  listing_name text,
  -- kept_listed | delisted | relisted | rechecked | cleared_flag
  action text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_recent_idx on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

drop policy if exists "founders record actions" on public.admin_actions;
create policy "founders record actions"
  on public.admin_actions for insert
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder')
  );

drop policy if exists "founders read the log" on public.admin_actions;
create policy "founders read the log"
  on public.admin_actions for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder')
  );

-- Append only. An audit log you can edit is not an audit log, it is a story
-- you can revise.
revoke update, delete on public.admin_actions from authenticated, anon;

-- ─────────────────────────────────────────────────── founder-only writes ────
-- Founders could already read every listing and every check. They could not
-- write to a listing they do not own, which made the review queue unusable.
drop policy if exists "founders manage any listing" on public.listings;
create policy "founders manage any listing"
  on public.listings for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'));

-- ───────────────────────────────────────────────────── vote oversight ───────
-- Deliberately narrow: it reports shape, not identities. A founder deciding
-- whether a listing was brigaded needs counts and timing, not a list of who
-- voted.
create or replace function public.admin_vote_signals()
returns table (
  listing_id uuid,
  total bigint,
  last_24h bigint,
  from_new_accounts bigint,
  distinct_days bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder') then
    raise exception 'Founder access required';
  end if;

  return query
    select
      v.listing_id,
      count(*),
      count(*) filter (where v.created_at > now() - interval '24 hours'),
      count(*) filter (where p.created_at > now() - interval '14 days'),
      count(distinct v.created_at::date)
    from public.votes v
    join public.profiles p on p.id = v.voter_id
    group by v.listing_id;
end;
$$;

revoke execute on function public.admin_vote_signals() from anon, authenticated;
grant execute on function public.admin_vote_signals() to authenticated;

comment on table public.admin_actions is
  'Append-only log of founder decisions. Who, what, why, when. No updates, no deletes.';
