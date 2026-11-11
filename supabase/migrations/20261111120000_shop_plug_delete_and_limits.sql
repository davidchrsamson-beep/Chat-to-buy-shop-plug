-- =====================================================================
-- Shop Plug — customers can delete their own messages, plus stronger flood limits.
--
-- Deleting really removes the words: the message text is wiped from the database,
-- and the chat shows "This message was deleted" instead.
--
-- Flood limits are now per visitor (by a scrambled code of their internet address,
-- never the address itself), so one person can't block everyone else.
-- =====================================================================
begin;

-- ---------- Deleting messages ----------
alter table public.shor_messages add column if not exists deleted_at timestamptz;

create or replace function public.shor_delete_message(p_request uuid, p_token text, p_message bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.shor_requests;
begin
  r := public.shor_own(p_request, p_token);
  if r.id is null then raise exception 'not found'; end if;
  -- Only the customer's own typed messages, in their own chat.
  update public.shor_messages
  set body = '', deleted_at = now()
  where id = p_message and request_id = r.id and sender = 'customer' and kind = 'text' and deleted_at is null;
  update public.shor_requests set updated_at = now() where id = r.id;
end;
$$;
revoke all on function public.shor_delete_message(uuid, text, bigint) from public;
grant execute on function public.shor_delete_message(uuid, text, bigint) to anon, authenticated;

-- The customer's screen now also learns which messages were deleted.
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
    'deleted', coalesce((select jsonb_agg(m.id) from public.shor_messages m
                         where m.request_id = r.id and m.deleted_at is not null), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'sender', m.sender, 'kind', m.kind, 'body', m.body,
                                          'data', m.data, 'at', m.created_at, 'deleted', m.deleted_at is not null) order by m.id)
      from public.shor_messages m where m.request_id = r.id and m.id > coalesce(p_after, 0)
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------- Per-visitor flood limits ----------
create table if not exists public.shor_rate (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists shor_rate_idx on public.shor_rate (bucket, key_hash, created_at);
alter table public.shor_rate enable row level security; -- no policies: only the function below touches it

-- Returns true (and counts it) if this visitor may do this now.
--   'start': new requests, 5 per 10 minutes per visitor
--   'send' : messages, 40 per minute per visitor
create or replace function public.shor_rate_ok(p_bucket text, p_key_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  win interval;
  max_n integer;
begin
  if p_key_hash is null or length(p_key_hash) < 16 or length(p_key_hash) > 128 then return false; end if;
  if p_bucket = 'start' then win := interval '10 minutes'; max_n := 5;
  elsif p_bucket = 'send' then win := interval '1 minute'; max_n := 40;
  else return false;
  end if;
  if (select count(*) from public.shor_rate
      where bucket = p_bucket and key_hash = p_key_hash and created_at > now() - win) >= max_n then
    return false;
  end if;
  insert into public.shor_rate (bucket, key_hash) values (p_bucket, p_key_hash);
  delete from public.shor_rate where created_at < now() - interval '1 day'; -- keeps the table tiny
  return true;
end;
$$;
revoke all on function public.shor_rate_ok(text, text) from public;
grant execute on function public.shor_rate_ok(text, text) to anon, authenticated;

-- The overall cap on new requests is raised (per-visitor limits now do the protecting).
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

  if (select count(*) from public.shor_requests where created_at > now() - interval '10 minutes') >= 300 then
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

commit;
