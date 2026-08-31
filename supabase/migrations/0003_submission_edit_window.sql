-- A 24-hour window to fix a mistake made at submission.
--
-- People mistype URLs and misdescribe what they built. Refusing to let them fix
-- it forever is hostile; letting them edit a listed entry indefinitely would let
-- a listing quietly become something different from what was verified. Twenty
-- four hours is the compromise, and it is enforced in the database so the
-- interface cannot quietly extend it.

alter table public.listings
  add column if not exists editable_until timestamptz not null default now() + interval '24 hours';

alter table public.listings
  add column if not exists last_edited_at timestamptz;

create index if not exists listings_editable_idx on public.listings (editable_until);

-- The window is fixed at submission. Nobody extends it — not the owner, not a
-- founder, not the weekly job.
create or replace function public.freeze_edit_window()
returns trigger
language plpgsql
as $$
begin
  new.editable_until := old.editable_until;
  return new;
end;
$$;

drop trigger if exists listings_freeze_edit_window on public.listings;
create trigger listings_freeze_edit_window
  before update on public.listings
  for each row execute function public.freeze_edit_window();

-- Verification is a fact observed by the bot, not a field a submitter sets.
-- Without this an owner could mark their own snippet "ok" and skip the crawl.
create or replace function public.guard_snippet_state()
returns trigger
language plpgsql
as $$
begin
  if new.snippet_state is distinct from old.snippet_state and auth.uid() is not null then
    raise exception 'Verification state is set by the weekly check, not by hand.';
  end if;
  return new;
end;
$$;

drop trigger if exists listings_snippet_state_guard on public.listings;
create trigger listings_snippet_state_guard
  before update on public.listings
  for each row execute function public.guard_snippet_state();

-- Status stays founder-only, with one exception: within the edit window the
-- owner may downgrade a listed entry back to pending so it has to be verified
-- again. Downgrading costs the submitter visibility; it cannot buy them
-- anything.
create or replace function public.guard_listing_status()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if auth.uid() is null then
      return new; -- the bot (service role) may promote a verified listing
    end if;
    if exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder') then
      return new;
    end if;
    if old.status = 'listed'
       and new.status = 'pending'
       and auth.uid() = new.owner_id
       and now() < old.editable_until then
      return new;
    end if;
    raise exception 'Only a founder may change listing status (from % to %)', old.status, new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_status_guard on public.listings;
create trigger listings_status_guard
  before update on public.listings
  for each row execute function public.guard_listing_status();

-- Editing is time-boxed in the policy itself, so a client that hides the button
-- still cannot write.
drop policy if exists "owners can edit their own listing content" on public.listings;
create policy "owners can edit their own listing within 24 hours"
  on public.listings for update
  using (owner_id = auth.uid() and now() < editable_until)
  with check (owner_id = auth.uid() and now() < editable_until);

-- Anyone can ask for the snippet to be re-checked; verification is not a
-- one-shot favour granted at submission.
comment on column public.listings.editable_until is
  'Fixed at submission as submitted_at + 24 hours. Enforced in RLS; cannot be extended.';
