-- =====================================================================
-- Shor plug — chat-first requests (MVP)
--
-- A customer taps "Make a request" and chats with the team. The team replies,
-- sends a bill (items + transport fare + late-night charge), the customer pays
-- by bank transfer and taps "I've paid", and a plug delivers and calls them.
--
-- Privacy and safety:
-- - Customers have no account. Each chat is unlocked by a long secret code kept
--   only on the customer's phone (stored here scrambled, never as-is).
-- - Only team members (listed in team_members) can read chats, phone numbers
--   and addresses. Nobody else can, not even other vendors.
-- - Limits stop anyone from flooding the system with fake requests or messages.
-- =====================================================================
begin;

create extension if not exists pgcrypto with schema extensions;

-- ---------- Who is on the team ----------
create table if not exists public.team_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.team_members enable row level security;

create or replace function public.is_team()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where user_id = auth.uid());
$$;
grant execute on function public.is_team() to authenticated;

-- ---------- Requests and messages ----------
create table if not exists public.shor_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                        -- e.g. SP-48213 (customers quote it when paying)
  token_hash text not null,                         -- the customer's secret code, scrambled
  customer_name text check (char_length(customer_name) <= 80),
  phone text check (char_length(phone) <= 20),
  address text check (char_length(address) <= 300),
  area text check (char_length(area) <= 40),
  status text not null default 'new'
    check (status in ('new', 'quoted', 'payment_claimed', 'paid', 'on_the_way', 'delivered', 'cancelled')),
  quote jsonb,
  last_customer_at timestamptz,
  last_team_at timestamptz,
  team_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shor_requests_token_idx on public.shor_requests (token_hash);
create index if not exists shor_requests_time_idx on public.shor_requests (created_at desc);

create table if not exists public.shor_messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.shor_requests (id) on delete cascade,
  sender text not null check (sender in ('customer', 'team')),
  kind text not null default 'text' check (kind in ('text', 'quote', 'paid', 'status')),
  body text not null default '' check (char_length(body) <= 2000),
  data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists shor_messages_request_idx on public.shor_messages (request_id, id);

alter table public.shor_requests enable row level security;
alter table public.shor_messages enable row level security;

-- Team members can read everything (the inbox). All writes go through the functions below.
drop policy if exists "shor_requests: team read" on public.shor_requests;
create policy "shor_requests: team read" on public.shor_requests for select to authenticated using (public.is_team());
drop policy if exists "shor_messages: team read" on public.shor_messages;
create policy "shor_messages: team read" on public.shor_messages for select to authenticated using (public.is_team());
grant select on public.shor_requests, public.shor_messages to authenticated;

-- ---------- Settings: bank account and fares (change any time in the settings table) ----------
insert into public.settings (key, value) values
  ('shor_bank', '{"bank": "YOUR BANK", "account_name": "YOUR ACCOUNT NAME", "account_number": "0000000000"}'),
  ('shor_pricing', '{"fares_kobo": [60000, 70000, 100000, 150000], "late_night_kobo": 50000, "bulky_kobo": 20000, "commission_kobo": 10000}')
on conflict (key) do nothing;

-- ---------- Helpers ----------
create or replace function public.shor_hash(p_token text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- Finds the customer's request, only if their secret code matches.
create or replace function public.shor_own(p_request uuid, p_token text)
returns public.shor_requests language sql stable security definer set search_path = '' as $$
  select r.* from public.shor_requests r
  where r.id = p_request and r.token_hash = public.shor_hash(p_token)
    and char_length(coalesce(p_token, '')) between 32 and 128;
$$;
revoke all on function public.shor_own(uuid, text) from public;

-- ---------- Customer side (called by the Shor plug app) ----------

-- Start a request, or continue the customer's open one.
create or replace function public.shor_start(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.shor_requests;
  new_code text;
begin
  if char_length(coalesce(p_token, '')) not between 32 and 128 then
    raise exception 'bad token';
  end if;

  select * into r from public.shor_requests
  where token_hash = public.shor_hash(p_token) and status not in ('delivered', 'cancelled')
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object('id', r.id, 'code', r.code);
  end if;

  -- Flood protection: at most 60 new requests per 10 minutes across everyone.
  if (select count(*) from public.shor_requests where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'busy';
  end if;

  loop
    new_code := 'SP-' || lpad((floor(random() * 100000))::int::text, 5, '0');
    exit when not exists (select 1 from public.shor_requests where code = new_code);
  end loop;

  insert into public.shor_requests (code, token_hash) values (new_code, public.shor_hash(p_token))
  returning * into r;
  return jsonb_build_object('id', r.id, 'code', r.code);
end;
$$;

create or replace function public.shor_send(p_request uuid, p_token text, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.shor_requests;
  b text := btrim(coalesce(p_body, ''));
begin
  r := public.shor_own(p_request, p_token);
  if r.id is null then raise exception 'not found'; end if;
  if char_length(b) = 0 or char_length(b) > 2000 then raise exception 'bad message'; end if;
  if (select count(*) from public.shor_messages
      where request_id = r.id and sender = 'customer' and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'slow down';
  end if;
  insert into public.shor_messages (request_id, sender, body) values (r.id, 'customer', b);
  update public.shor_requests set last_customer_at = now(), updated_at = now() where id = r.id;
end;
$$;

create or replace function public.shor_save_details(
  p_request uuid, p_token text, p_name text, p_phone text, p_address text, p_area text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.shor_requests;
begin
  r := public.shor_own(p_request, p_token);
  if r.id is null then raise exception 'not found'; end if;
  update public.shor_requests set
    customer_name = left(btrim(coalesce(p_name, '')), 80),
    phone = left(btrim(coalesce(p_phone, '')), 20),
    address = left(btrim(coalesce(p_address, '')), 300),
    area = left(btrim(coalesce(p_area, '')), 40),
    last_customer_at = now(), updated_at = now()
  where id = r.id;
end;
$$;

-- Everything the customer's screen needs: status, bill, bank details, and new messages.
create or replace function public.shor_poll(p_request uuid, p_token text, p_after bigint default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r public.shor_requests;
begin
  r := public.shor_own(p_request, p_token);
  if r.id is null then return null; end if;
  return jsonb_build_object(
    'code', r.code,
    'status', r.status,
    'has_details', r.phone is not null and r.phone <> '' and r.address is not null and r.address <> '',
    'phone', r.phone,
    'quote', r.quote,
    'bank', (select value from public.settings where key = 'shor_bank'),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'sender', m.sender, 'kind', m.kind, 'body', m.body,
                                          'data', m.data, 'at', m.created_at) order by m.id)
      from public.shor_messages m where m.request_id = r.id and m.id > coalesce(p_after, 0)
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.shor_mark_paid(p_request uuid, p_token text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.shor_requests;
begin
  r := public.shor_own(p_request, p_token);
  if r.id is null then raise exception 'not found'; end if;
  if r.status <> 'quoted' then return; end if;
  update public.shor_requests set status = 'payment_claimed', last_customer_at = now(), updated_at = now() where id = r.id;
  insert into public.shor_messages (request_id, sender, kind, body) values (r.id, 'customer', 'paid', 'I''ve paid');
end;
$$;

revoke all on function public.shor_start(text) from public;
revoke all on function public.shor_send(uuid, text, text) from public;
revoke all on function public.shor_save_details(uuid, text, text, text, text, text) from public;
revoke all on function public.shor_poll(uuid, text, bigint) from public;
revoke all on function public.shor_mark_paid(uuid, text) from public;
grant execute on function public.shor_start(text) to anon, authenticated;
grant execute on function public.shor_send(uuid, text, text) to anon, authenticated;
grant execute on function public.shor_save_details(uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.shor_poll(uuid, text, bigint) to anon, authenticated;
grant execute on function public.shor_mark_paid(uuid, text) to anon, authenticated;

-- ---------- Team side (the inbox on the main site) ----------

create or replace function public.shor_team_send(p_request uuid, p_body text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  b text := btrim(coalesce(p_body, ''));
begin
  if not public.is_team() then raise exception 'not allowed'; end if;
  if char_length(b) = 0 or char_length(b) > 2000 then raise exception 'bad message'; end if;
  insert into public.shor_messages (request_id, sender, body) values (p_request, 'team', b);
  update public.shor_requests set last_team_at = now(), team_seen_at = now(), updated_at = now() where id = p_request;
end;
$$;

-- The bill. The total is worked out HERE from the pricing settings, so it always adds up.
-- p_items: [{"label": "2 bottles of Baileys", "amount_kobo": 3000000}, ...]
create or replace function public.shor_team_quote(p_request uuid, p_items jsonb, p_fare_kobo bigint, p_late boolean, p_bulky boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pricing jsonb := (select value from public.settings where key = 'shor_pricing');
  items jsonb := '[]'::jsonb;
  it jsonb;
  items_total bigint := 0;
  late bigint := 0;
  bulky bigint := 0;
  q jsonb;
begin
  if not public.is_team() then raise exception 'not allowed'; end if;
  if p_fare_kobo is null or p_fare_kobo < 0 or p_fare_kobo > 10000000 then raise exception 'bad fare'; end if;

  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if btrim(coalesce(it->>'label', '')) <> '' and (it->>'amount_kobo') ~ '^\d{1,12}$' then
      items := items || jsonb_build_array(jsonb_build_object(
        'label', left(btrim(it->>'label'), 120), 'amount_kobo', (it->>'amount_kobo')::bigint));
      items_total := items_total + (it->>'amount_kobo')::bigint;
    end if;
  end loop;

  if p_late then late := coalesce((pricing->>'late_night_kobo')::bigint, 50000); end if;
  if p_bulky then bulky := coalesce((pricing->>'bulky_kobo')::bigint, 20000); end if;

  q := jsonb_build_object(
    'items', items,
    'items_kobo', items_total,
    'fare_kobo', p_fare_kobo,
    'late_kobo', late,
    'bulky_kobo', bulky,
    'total_kobo', items_total + p_fare_kobo + late + bulky,
    'sent_at', now()
  );

  update public.shor_requests set quote = q, status = 'quoted', last_team_at = now(), team_seen_at = now(), updated_at = now()
  where id = p_request;
  insert into public.shor_messages (request_id, sender, kind, body, data) values (p_request, 'team', 'quote', 'Your bill', q);
  return q;
end;
$$;

create or replace function public.shor_team_status(p_request uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  note text := case p_status
    when 'paid' then 'Payment confirmed. Your plug is getting your order now.'
    when 'on_the_way' then 'Your plug is on the way and will call you shortly.'
    when 'delivered' then 'Delivered. Thank you for using Shor plug!'
    when 'cancelled' then 'This request has been cancelled.'
  end;
begin
  if not public.is_team() then raise exception 'not allowed'; end if;
  if note is null then raise exception 'bad status'; end if;
  update public.shor_requests set status = p_status, last_team_at = now(), team_seen_at = now(), updated_at = now()
  where id = p_request;
  insert into public.shor_messages (request_id, sender, kind, body) values (p_request, 'team', 'status', note);
end;
$$;

create or replace function public.shor_team_seen(p_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_team() then raise exception 'not allowed'; end if;
  update public.shor_requests set team_seen_at = now() where id = p_request;
end;
$$;

revoke all on function public.shor_team_send(uuid, text) from public;
revoke all on function public.shor_team_quote(uuid, jsonb, bigint, boolean, boolean) from public;
revoke all on function public.shor_team_status(uuid, text) from public;
revoke all on function public.shor_team_seen(uuid) from public;
grant execute on function public.shor_team_send(uuid, text) to authenticated;
grant execute on function public.shor_team_quote(uuid, jsonb, bigint, boolean, boolean) to authenticated;
grant execute on function public.shor_team_status(uuid, text) to authenticated;
grant execute on function public.shor_team_seen(uuid) to authenticated;

commit;
