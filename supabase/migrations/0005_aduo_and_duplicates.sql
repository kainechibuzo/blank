-- Stage 3 (ADUO) and the duplicate-submission fix.
--
-- Run after 0001-0004.

-- ────────────────────────────────────────────────────────── site identity ───
-- One answer to "is this the same site?". Without it, the same address typed
-- four ways is four listings, and a submitter whose first attempt seemed to
-- fail can pile up copies of the same claim.
create or replace function public.site_key_of(p_url text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(lower(coalesce(p_url, '')), '^https?://', ''),
               '^www\.', ''),
             '[?#].*$', ''),
           '/+$', '');
$$;

alter table public.listings add column if not exists site_key text;

update public.listings set site_key = public.site_key_of(url) where site_key is null;

-- Clear out existing self-duplicates before the constraint goes on: keep the
-- earliest submission, drop the later copies. This is the cleanup for anyone who
-- already has duplicates in their data.
delete from public.listings l
using public.listings l2
where l.id <> l2.id
  and l.owner_id = l2.owner_id
  and l.site_key = l2.site_key
  and (l.submitted_at, l.id) > (l2.submitted_at, l2.id);

create or replace function public.set_site_key()
returns trigger
language plpgsql
as $$
begin
  new.site_key := public.site_key_of(new.url);
  return new;
end;
$$;

drop trigger if exists listings_set_site_key on public.listings;
create trigger listings_set_site_key
  before insert or update of url on public.listings
  for each row execute function public.set_site_key();

-- One submission per owner per site.
create unique index if not exists listings_one_per_owner_per_site
  on public.listings (owner_id, site_key);

-- Indexed but NOT unique: two different people may claim the same site. Only
-- one of them can actually verify it, and that is a dispute for a human, not
-- something to resolve with a constraint.
create index if not exists listings_site_key_idx on public.listings (site_key);

-- ────────────────────────────────────────────────────────────────── ADUO ────
-- Balance-of-performance boost. Applications, decisions, and the record of what
-- each decision was based on.
--
-- Thresholds are UNRATIFIED and live in src/lib/aduo.js, not here. They are
-- applied by a human at decision time and recorded below, so the rule can be
-- changed later without rewriting history.
alter table public.listings add column if not exists aduo_granted_at timestamptz;

create table if not exists public.aduo_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,

  status text not null default 'pending'
    check (status in ('pending', 'granted', 'declined', 'withdrawn')),

  -- Evidence the applicant supplies. Traffic and reviews cannot be computed
  -- here: this site runs no analytics and has no review provider, and inventing
  -- a number would be worse than leaving it unknown.
  traffic_evidence text,
  reviews_evidence text,
  applicant_note text,

  -- What the founder recorded when deciding, so the decision can be audited
  -- later even if the thresholds move.
  traffic_ok boolean,
  reviews_ok boolean,
  tos_score numeric,
  tos_coverage numeric,
  tos_ok boolean,
  upvotes_at_decision numeric,
  upvote_ok boolean,
  thresholds_ratified_at_decision boolean not null default false,

  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now()
);

-- One open application per listing at a time, so a refused applicant cannot
-- spam the queue.
create unique index if not exists aduo_one_open_per_listing
  on public.aduo_applications (listing_id)
  where status = 'pending';

create index if not exists aduo_status_idx on public.aduo_applications (status, created_at desc);

alter table public.aduo_applications enable row level security;

drop policy if exists "applicants and founders read applications" on public.aduo_applications;
create policy "applicants and founders read applications"
  on public.aduo_applications for select
  using (
    requested_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder')
  );

drop policy if exists "owners of listed listings may apply" on public.aduo_applications;
create policy "owners of listed listings may apply"
  on public.aduo_applications for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid() and l.status = 'listed'
    )
  );

drop policy if exists "applicants may withdraw" on public.aduo_applications;
create policy "applicants may withdraw"
  on public.aduo_applications for update
  using (requested_by = auth.uid() and status = 'pending')
  with check (requested_by = auth.uid() and status in ('pending', 'withdrawn'));

-- Deciding is founder-only, and only founders can change a decision.
drop policy if exists "founders decide applications" on public.aduo_applications;
create policy "founders decide applications"
  on public.aduo_applications for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'));

-- ─────────────────────────────────────────────────── duplicate claims ───────
-- Cross-owner duplicates, surfaced for a human. Founder-only.
create or replace function public.admin_duplicate_claims()
returns table (site_key text, claim_count bigint, listing_names text[])
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
    select l.site_key, count(*), array_agg(l.name order by l.submitted_at)
    from public.listings l
    where l.site_key is not null
    group by l.site_key
    having count(*) > 1;
end;
$$;

revoke execute on function public.admin_duplicate_claims() from anon, authenticated;
grant execute on function public.admin_duplicate_claims() to authenticated;

comment on column public.listings.site_key is
  'Normalised host+path from site_key_of(url). Unique per owner, so the same person cannot claim the same site twice.';
comment on column public.listings.aduo_granted_at is
  'Set by a founder decision only. Reorders the directory; never touches Phase 1.';
