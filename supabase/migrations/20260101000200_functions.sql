-- =====================================================================
-- Business logic: bundle generation, payments, ticketing, reception.
-- =====================================================================

-- 1) "Enter once": one call creates the event and everything derived from it.
create or replace function public.create_event_bundle(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_event uuid;
  v_type text := coalesce(payload->>'type', 'custom');
  v_public boolean := coalesce((payload->>'is_public')::boolean, false);
  v_item jsonb;
  v_name text;
  v_campaign boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if coalesce(trim(payload->>'title'), '') = '' then
    raise exception 'title is required';
  end if;

  insert into events (owner_id, type, title, honoree_names, host_name, description, starts_at, ends_at,
                      venue_name, venue_address, city, dress_code, rsvp_phone, is_public, status, details)
  values (auth.uid(), v_type, trim(payload->>'title'), nullif(payload->>'honoree_names',''),
          nullif(payload->>'host_name',''), nullif(payload->>'description',''),
          (payload->>'starts_at')::timestamptz, nullif(payload->>'ends_at','')::timestamptz,
          nullif(payload->>'venue_name',''), nullif(payload->>'venue_address',''), nullif(payload->>'city',''),
          nullif(payload->>'dress_code',''), nullif(payload->>'rsvp_phone',''), v_public, 'draft',
          coalesce(payload->'details', '{}'::jsonb))
  returning id into v_event;

  insert into event_members (event_id, user_id, role) values (v_event, auth.uid(), 'owner');

  -- Invitation + contribution + save-the-date + reminder + thank-you cards.
  insert into cards (event_id, kind)
  select v_event, k from unnest(array['invitation','contribution','save_the_date','reminder','thank_you']) as k;

  -- Ticket categories (public events only).
  if v_public then
    for v_item in select value from jsonb_array_elements(coalesce(payload->'tickets', '[]'::jsonb)) loop
      v_name := v_item->>'name';
      insert into ticket_categories (event_id, name, price, capacity, group_size)
      values (v_event, v_name, coalesce((v_item->>'price')::numeric, 0),
              nullif(v_item->>'capacity','')::int,
              case v_name when 'Couple' then 2 when 'Group' then coalesce((v_item->>'group_size')::int, 5) else 1 end);
    end loop;
  end if;

  -- Contribution campaign.
  v_campaign := coalesce((payload->>'contributions')::boolean, false) or v_type in ('fundraiser','memorial');
  if v_campaign then
    insert into contribution_campaigns (event_id, title, target_amount)
    values (v_event, trim(payload->>'title'), nullif(payload->>'contribution_target','')::numeric);
  end if;

  -- Guest roster (also the reception check-in list).
  for v_item in select value from jsonb_array_elements(coalesce(payload->'guests', '[]'::jsonb)) loop
    if coalesce(trim(v_item->>'full_name'), '') <> '' then
      insert into guests (event_id, full_name, phone)
      values (v_event, trim(v_item->>'full_name'), nullif(v_item->>'phone',''));
    end if;
  end loop;

  return v_event;
end $$;
revoke all on function public.create_event_bundle(jsonb) from public, anon;
grant execute on function public.create_event_bundle(jsonb) to authenticated;

-- 2) Webhook trigger: any payment change recalculates the parent order/contribution.
create or replace function public.apply_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_paid numeric;
  v_status text;
  o orders%rowtype;
  k contributions%rowtype;
  v_owner uuid;
  v_event uuid;
  v_was_paid boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_was_paid := (old.status = 'paid');
  end if;
  if new.order_id is not null then
    select * into o from orders where id = new.order_id for update;
    select coalesce(sum(amount), 0) into v_paid from payments where order_id = o.id and status = 'paid';
    v_status := case
      when v_paid >= o.amount_due then 'paid'
      when v_paid > 0 then 'partial'
      when new.status in ('failed','expired') then new.status
      else 'pending' end;
    update orders set amount_paid = v_paid, status = v_status where id = o.id;

    if v_status = 'paid' and not exists (select 1 from tickets where order_id = o.id) then
      insert into tickets (event_id, order_id, category_id, holder_name, admits, status)
      select o.event_id, o.id, o.category_id, o.buyer_name, c.group_size, 'confirmed'
      from generate_series(1, o.quantity) gs, ticket_categories c
      where c.id = o.category_id;

      update ticket_categories set sold = sold + o.quantity where id = o.category_id;

      select owner_id into v_owner from events where id = o.event_id;
      insert into notifications (user_id, event_id, title, body)
      values (v_owner, o.event_id, 'Ticket sale confirmed', o.quantity || ' ticket(s) paid by ' || o.buyer_name);
    end if;

  elsif new.contribution_id is not null then
    select * into k from contributions where id = new.contribution_id for update;
    select coalesce(sum(amount), 0) into v_paid from payments where contribution_id = k.id and status = 'paid';
    v_status := case
      when v_paid >= k.pledged then 'paid'
      when v_paid > 0 then 'partial'
      when new.status in ('failed','expired') then new.status
      else 'pending' end;
    update contributions set paid = v_paid, status = v_status where id = k.id;

    if new.status = 'paid' and not v_was_paid then
      select e.owner_id, e.id into v_owner, v_event
      from contribution_campaigns c join events e on e.id = c.event_id where c.id = k.campaign_id;
      insert into notifications (user_id, event_id, title, body)
      values (v_owner, v_event, 'Contribution received', k.contributor_name || ' contributed ' || new.amount || ' ' || new.currency);
    end if;
  end if;
  return new;
end $$;

create trigger payments_apply after insert or update of status, amount on public.payments
for each row execute function public.apply_payment();

-- 3) Checkout (server only): capacity-safe order creation.
create or replace function public.create_order(
  p_category uuid, p_buyer_name text, p_buyer_phone text, p_buyer_email text, p_quantity int)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  c ticket_categories%rowtype;
  e events%rowtype;
  v_reserved int;
  o orders%rowtype;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 20 then
    raise exception 'invalid quantity';
  end if;
  select * into c from ticket_categories where id = p_category for update;
  if not found then raise exception 'category not found'; end if;
  select * into e from events where id = c.event_id;
  if not e.is_public or e.status not in ('confirmed','live') then
    raise exception 'event is not on sale';
  end if;
  if (c.sales_start is not null and now() < c.sales_start) or (c.sales_end is not null and now() > c.sales_end) then
    raise exception 'sales are closed for this category';
  end if;
  select coalesce(sum(quantity), 0) into v_reserved from orders
  where category_id = c.id and ((status = 'pending' and expires_at > now()) or status = 'partial');
  if c.capacity is not null and c.sold + v_reserved + p_quantity > c.capacity then
    raise exception 'sold out';
  end if;
  insert into orders (event_id, category_id, buyer_name, buyer_phone, buyer_email, quantity, amount_due, currency)
  values (c.event_id, c.id, trim(p_buyer_name), trim(p_buyer_phone), nullif(trim(p_buyer_email), ''),
          p_quantity, c.price * p_quantity, c.currency)
  returning * into o;
  return o;
end $$;
revoke all on function public.create_order(uuid, text, text, text, int) from public, anon, authenticated;
grant execute on function public.create_order(uuid, text, text, text, int) to service_role;

-- 4) Expire stale pending payments (called by the server on a timer).
create or replace function public.expire_stale_orders() returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update payments set status = 'expired'
  where status = 'pending' and order_id is not null and created_at < now() - interval '15 minutes';
  get diagnostics v_count = row_count;
  update orders set status = 'expired'
  where status = 'pending' and expires_at < now()
    and not exists (select 1 from payments p where p.order_id = orders.id and p.status = 'pending');
  return v_count;
end $$;
revoke all on function public.expire_stale_orders() from public, anon, authenticated;
grant execute on function public.expire_stale_orders() to service_role;

-- 5) Reception: roster download for offline use.
create or replace function public.get_reception_roster(p_event uuid)
returns table (token text, name text, kind text, admits int, checked_in boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_event_role(p_event, array['owner','co_organizer','reception']) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select t.qr_token, t.holder_name, 'ticket'::text, t.admits, (t.status = 'checked_in')
    from tickets t where t.event_id = p_event and t.status in ('confirmed','checked_in')
    union all
    select g.qr_token, g.full_name, 'guest'::text, g.seats, (g.checked_in_at is not null)
    from guests g where g.event_id = p_event;
end $$;
revoke all on function public.get_reception_roster(uuid) from public, anon;
grant execute on function public.get_reception_roster(uuid) to authenticated;

-- 6) Reception: idempotent batch sync of offline scans (oldest scan wins).
create or replace function public.checkin_batch(p_event uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item jsonb;
  v_id uuid;
  v_token text;
  v_at timestamptz;
  v_result text;
  v_ticket tickets%rowtype;
  v_guest guests%rowtype;
  v_out jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.has_event_role(p_event, array['owner','co_organizer','reception']) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
    order by (value->>'scanned_at')::timestamptz
  loop
    v_id := (v_item->>'id')::uuid;
    v_token := v_item->>'qr_token';
    v_at := coalesce((v_item->>'scanned_at')::timestamptz, now());

    if exists (select 1 from checkins where id = v_id) then
      continue; -- already synced (retry)
    end if;

    select * into v_ticket from tickets where event_id = p_event and qr_token = v_token for update;
    if found then
      if v_ticket.status = 'confirmed' then
        update tickets set status = 'checked_in', checked_in_at = v_at where id = v_ticket.id;
        v_result := 'accepted';
      elsif v_ticket.status = 'checked_in' then
        v_result := 'duplicate';
      else
        v_result := 'invalid';
      end if;
      insert into checkins (id, event_id, ticket_id, qr_token, scanned_by, scanned_at, result)
      values (v_id, p_event, v_ticket.id, v_token, auth.uid(), v_at, v_result);
    else
      select * into v_guest from guests where event_id = p_event and qr_token = v_token for update;
      if found then
        if v_guest.checked_in_at is null then
          update guests set checked_in_at = v_at where id = v_guest.id;
          v_result := 'accepted';
        else
          v_result := 'duplicate';
        end if;
        insert into checkins (id, event_id, guest_id, qr_token, scanned_by, scanned_at, result)
        values (v_id, p_event, v_guest.id, v_token, auth.uid(), v_at, v_result);
      else
        v_result := 'invalid';
        insert into checkins (id, event_id, qr_token, scanned_by, scanned_at, result)
        values (v_id, p_event, v_token, auth.uid(), v_at, v_result);
      end if;
    end if;

    v_out := v_out || jsonb_build_object('id', v_id, 'result', v_result);
  end loop;
  return v_out;
end $$;
revoke all on function public.checkin_batch(uuid, jsonb) from public, anon;
grant execute on function public.checkin_batch(uuid, jsonb) to authenticated;
