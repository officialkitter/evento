-- =====================================================================
-- Evento schema: one `events` row is the single source of truth for
-- invitations, tickets and reception rosters ("enter once, use everywhere").
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'custom'
    check (type in ('wedding','birthday','graduation','memorial','corporate','party','fundraiser','custom')),
  title text not null,
  honoree_names text,
  host_name text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Africa/Dar_es_Salaam',
  venue_name text,
  venue_address text,
  city text,
  dress_code text,
  rsvp_phone text,
  cover_theme text not null default 'gold',
  is_public boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft','pending','confirmed','live','expired')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_owner_idx on public.events(owner_id);
create index events_public_idx on public.events(is_public, status, starts_at);

create table public.event_members (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','co_organizer','contributor_manager','reception')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_members_user_idx on public.event_members(user_id);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  group_label text,
  seats int not null default 1 check (seats >= 1),
  rsvp text not null default 'pending' check (rsvp in ('pending','yes','no')),
  qr_token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create index guests_event_idx on public.guests(event_id);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('invitation','contribution','save_the_date','reminder','thank_you')),
  template_key text not null default 'classic_gold',
  status text not null default 'draft' check (status in ('draft','pending','confirmed','failed','expired')),
  created_at timestamptz not null default now(),
  unique (event_id, kind)
);

create table public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (name in ('Regular','VIP','VVIP','Early Bird','Couple','Group')),
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'TZS',
  capacity int check (capacity is null or capacity >= 0),
  sold int not null default 0,
  group_size int not null default 1 check (group_size >= 1),
  sales_start timestamptz,
  sales_end timestamptz,
  unique (event_id, name)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid not null references public.ticket_categories(id),
  reference text not null unique default ('ORD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  buyer_name text not null,
  buyer_phone text not null,
  buyer_email text,
  quantity int not null check (quantity between 1 and 20),
  amount_due numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  currency text not null default 'TZS',
  status text not null default 'pending' check (status in ('pending','paid','partial','failed','expired')),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);
create index orders_event_idx on public.orders(event_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  category_id uuid not null references public.ticket_categories(id),
  holder_name text not null default '',
  admits int not null default 1,
  qr_token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  status text not null default 'confirmed' check (status in ('pending','confirmed','checked_in','expired','failed')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create index tickets_event_idx on public.tickets(event_id);
create index tickets_order_idx on public.tickets(order_id);

create table public.contribution_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  title text not null,
  target_amount numeric(12,2),
  currency text not null default 'TZS',
  created_at timestamptz not null default now()
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.contribution_campaigns(id) on delete cascade,
  contributor_name text not null,
  contributor_phone text,
  pledged numeric(12,2) not null check (pledged > 0),
  paid numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','partial','failed','expired')),
  created_at timestamptz not null default now()
);
create index contributions_campaign_idx on public.contributions(campaign_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  contribution_id uuid references public.contributions(id) on delete cascade,
  provider text not null,
  provider_ref text not null,
  amount numeric(12,2) not null,
  currency text not null default 'TZS',
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  raw jsonb,
  created_at timestamptz not null default now(),
  check (num_nonnulls(order_id, contribution_id) = 1),
  unique (provider, provider_ref)
);
create index payments_order_idx on public.payments(order_id);
create index payments_contribution_idx on public.payments(contribution_id);

-- Idempotency log for provider webhooks.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (provider, event_key)
);

-- Reception scans. `id` is generated on the device so offline retries are idempotent.
create table public.checkins (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete set null,
  guest_id uuid references public.guests(id) on delete set null,
  qr_token text not null,
  scanned_by uuid references auth.users(id),
  scanned_at timestamptz not null default now(),
  synced_at timestamptz not null default now(),
  result text not null check (result in ('accepted','duplicate','invalid'))
);
create index checkins_event_idx on public.checkins(event_id, scanned_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Shared template variables: invitations, tickets and rosters all read this.
-- security_invoker => RLS of the caller applies.
-- ---------------------------------------------------------------------
create or replace view public.event_template_vars with (security_invoker = true) as
select
  e.id as event_id,
  e.type,
  e.title,
  coalesce(nullif(e.honoree_names, ''), e.title) as headline_names,
  e.host_name,
  e.description,
  to_char(e.starts_at at time zone e.timezone, 'FMDay, FMDD FMMonth YYYY') as date_long,
  to_char(e.starts_at at time zone e.timezone, 'HH24:MI') as time_short,
  e.venue_name,
  e.venue_address,
  e.city,
  e.dress_code,
  e.rsvp_phone,
  e.cover_theme,
  e.is_public,
  (select count(*) from public.guests g where g.event_id = e.id) as guest_count
from public.events e;

-- ---------------------------------------------------------------------
-- Housekeeping triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger events_updated_at before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, nullif(new.phone, ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Realtime: reception dashboards listen to scans and ticket changes.
alter publication supabase_realtime add table public.checkins;
alter publication supabase_realtime add table public.tickets;
