-- Phase 2 directory: submissions, snippet verification, and the check log.
--
-- SEPARATION RULE, enforced structurally:
-- this schema never feeds the Phase 1 transparency score. The provider dataset
-- is a static module imported by the app; nothing in these tables is joined into
-- scoring, ranking, or evaluation order. A listing may carry `linked_tool_id`
-- purely so its page can display an existing Phase 1 row — display only, and it
-- is never written back the other way.
--
-- Run this in the Supabase SQL editor, or with `supabase db push`.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────── profiles ───────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  role text not null default 'user' check (role in ('user', 'founder')),
  created_at timestamptz not null default now()
);

-- created_at here is the account-age source for the Stage 2 anti-gaming rule.
-- It mirrors auth.users.created_at and is never editable by the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, created_at)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.created_at)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────── listings ───────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,

  name text not null,
  url text not null,
  category text,
  blurb text,
  -- What the submitter claims the site is, e.g. "music site". The bot's job is
  -- to confirm the live site matches this claim, not to grade it.
  claimed_description text,

  verify_token text not null unique,

  -- pending  → awaiting a successful snippet check
  -- listed   → snippet confirmed, publicly visible
  -- delisted → removed after human review (founder only; see guard below)
  status text not null default 'pending' check (status in ('pending', 'listed', 'delisted')),

  snippet_state text not null default 'unchecked'
    check (snippet_state in ('unchecked', 'ok', 'altered', 'missing', 'unreachable')),

  review_required boolean not null default false,
  review_reason text,
  warning_message text,

  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  last_checked_at timestamptz,

  -- Display-only link to a Phase 1 tool row. Never used in scoring.
  linked_tool_id text
);

create index if not exists listings_owner_idx on public.listings (owner_id);
create index if not exists listings_status_idx on public.listings (status);

-- ────────────────────────────────────────────────────── snippet checks ──────
-- The commit-history-style log. Append only: a check is a fact about a moment,
-- so there is no update path and no way to quietly rewrite history.
create table if not exists public.snippet_checks (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  checked_at timestamptz not null default now(),
  outcome text not null check (outcome in ('ok', 'altered', 'missing', 'unreachable')),
  http_status int,
  expected_token text not null,
  found_token text,
  note text
);

create index if not exists snippet_checks_listing_idx on public.snippet_checks (listing_id, checked_at desc);

-- ───────────────────────────────────────────── the no-auto-removal guard ────
-- "No auto-ban on first detection" is a roadmap rule. Enforcing it in the
-- application layer alone means it can be bypassed by a future script, so it is
-- enforced here too: a signed-in non-founder can never change listing status.
-- The service role (auth.uid() is null) may, which is how a verified snippet
-- promotes a listing from pending → listed. No code path delists automatically;
-- scripts/check-directory-snippets.mjs is scanned for that by the traceability
-- check, so the rule is asserted twice.
create or replace function public.guard_listing_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status
     and auth.uid() is not null
     and not exists (
       select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'
     ) then
    raise exception 'Only a founder may change listing status (from % to %)', old.status, new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_status_guard on public.listings;
create trigger listings_status_guard
  before update on public.listings
  for each row execute function public.guard_listing_status();

-- ───────────────────────────────────────────────────────────────── RLS ──────
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.snippet_checks enable row level security;

drop policy if exists "profiles are readable by their owner" on public.profiles;
create policy "profiles are readable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "listed listings are public" on public.listings;
create policy "listed listings are public"
  on public.listings for select
  using (status = 'listed' or owner_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'
  ));

drop policy if exists "signed-in users can submit" on public.listings;
create policy "signed-in users can submit"
  on public.listings for insert
  with check (auth.uid() = owner_id);

drop policy if exists "owners can edit their own listing content" on public.listings;
create policy "owners can edit their own listing content"
  on public.listings for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
-- Note: status changes are still blocked for them by guard_listing_status().

drop policy if exists "check log readable by owner and founder" on public.snippet_checks;
create policy "check log readable by owner and founder"
  on public.snippet_checks for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.owner_id = auth.uid() or exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'
        ))
    )
  );
-- Inserts into snippet_checks are service-role only (the bot), by design: a
-- client must not be able to write its own verification history.
