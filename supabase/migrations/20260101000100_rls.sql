-- =====================================================================
-- Row Level Security
-- Writes to orders/tickets/payments happen only through the server
-- (service role) and SECURITY DEFINER functions.
-- =====================================================================

create or replace function public.has_event_role(p_event uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.event_members m
    where m.event_id = p_event and m.user_id = auth.uid() and m.role = any (p_roles)
  );
$$;
revoke all on function public.has_event_role(uuid, text[]) from public, anon;
grant execute on function public.has_event_role(uuid, text[]) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.guests enable row level security;
alter table public.cards enable row level security;
alter table public.ticket_categories enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.contribution_campaigns enable row level security;
alter table public.contributions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.checkins enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- events
create policy events_select on public.events for select to authenticated using (
  (is_public and status in ('confirmed','live'))
  or public.has_event_role(id, array['owner','co_organizer','contributor_manager','reception'])
);
create policy events_insert on public.events for insert to authenticated with check (owner_id = auth.uid());
create policy events_update on public.events for update to authenticated
  using (public.has_event_role(id, array['owner','co_organizer']))
  with check (public.has_event_role(id, array['owner','co_organizer']));
create policy events_delete on public.events for delete to authenticated
  using (public.has_event_role(id, array['owner']));

-- members
create policy members_select on public.event_members for select to authenticated using (
  user_id = auth.uid() or public.has_event_role(event_id, array['owner','co_organizer'])
);
create policy members_insert on public.event_members for insert to authenticated
  with check (public.has_event_role(event_id, array['owner']));
create policy members_delete on public.event_members for delete to authenticated
  using (public.has_event_role(event_id, array['owner']));

-- guests
create policy guests_select on public.guests for select to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer','reception']));
create policy guests_write on public.guests for all to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer']))
  with check (public.has_event_role(event_id, array['owner','co_organizer']));

-- cards
create policy cards_select on public.cards for select to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer','contributor_manager']));
create policy cards_write on public.cards for all to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer']))
  with check (public.has_event_role(event_id, array['owner','co_organizer']));

-- ticket categories
create policy categories_select on public.ticket_categories for select to authenticated using (
  public.has_event_role(event_id, array['owner','co_organizer','reception'])
  or exists (select 1 from public.events e where e.id = event_id and e.is_public and e.status in ('confirmed','live'))
);
create policy categories_write on public.ticket_categories for all to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer']))
  with check (public.has_event_role(event_id, array['owner','co_organizer']));

-- orders / tickets / payments: read-only for organizers
create policy orders_select on public.orders for select to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer']));
create policy tickets_select on public.tickets for select to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer','reception']));
create policy payments_select on public.payments for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id
          and public.has_event_role(o.event_id, array['owner','co_organizer']))
  or exists (select 1 from public.contributions c
             join public.contribution_campaigns k on k.id = c.campaign_id
             where c.id = contribution_id
               and public.has_event_role(k.event_id, array['owner','co_organizer','contributor_manager']))
);

-- contributions
create policy campaigns_select on public.contribution_campaigns for select to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer','contributor_manager']));
create policy campaigns_write on public.contribution_campaigns for all to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer']))
  with check (public.has_event_role(event_id, array['owner','co_organizer']));
create policy contributions_select on public.contributions for select to authenticated using (
  exists (select 1 from public.contribution_campaigns k where k.id = campaign_id
          and public.has_event_role(k.event_id, array['owner','co_organizer','contributor_manager']))
);

-- checkins (inserted only through checkin_batch)
create policy checkins_select on public.checkins for select to authenticated
  using (public.has_event_role(event_id, array['owner','co_organizer','reception']));

-- notifications
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- payment_events: no policies => service role only.
