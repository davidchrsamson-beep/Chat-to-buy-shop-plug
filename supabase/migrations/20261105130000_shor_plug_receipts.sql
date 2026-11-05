-- =====================================================================
-- Shor plug — payment receipts
-- "I've paid" now needs a photo or screenshot of the transfer receipt.
-- Receipts are private: only the team can see them (the customer's phone keeps its own copy).
-- =====================================================================
begin;

create table if not exists public.shor_receipts (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.shor_requests (id) on delete cascade,
  image text not null check (image like 'data:image/jpeg;base64,%' and char_length(image) <= 900000),
  created_at timestamptz not null default now()
);
create index if not exists shor_receipts_request_idx on public.shor_receipts (request_id, created_at desc);

alter table public.shor_receipts enable row level security;
drop policy if exists "shor_receipts: team read" on public.shor_receipts;
create policy "shor_receipts: team read" on public.shor_receipts for select to authenticated using (public.is_team());
grant select on public.shor_receipts to authenticated;

-- Old "I've paid" without a receipt is no longer allowed.
drop function if exists public.shor_mark_paid(uuid, text);

create or replace function public.shor_mark_paid(p_request uuid, p_token text, p_receipt text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.shor_requests;
  rid bigint;
begin
  r := public.shor_own(p_request, p_token);
  if r.id is null then raise exception 'not found'; end if;
  if r.status not in ('quoted', 'payment_claimed') then raise exception 'no bill to pay'; end if;
  if p_receipt is null or p_receipt not like 'data:image/jpeg;base64,%' or char_length(p_receipt) > 900000 then
    raise exception 'bad receipt';
  end if;
  -- At most 5 receipts per request (e.g. a blurry one, then a clear one).
  if (select count(*) from public.shor_receipts where request_id = r.id) >= 5 then
    raise exception 'too many receipts';
  end if;

  insert into public.shor_receipts (request_id, image) values (r.id, p_receipt) returning id into rid;
  update public.shor_requests set status = 'payment_claimed', last_customer_at = now(), updated_at = now() where id = r.id;
  insert into public.shor_messages (request_id, sender, kind, body, data)
  values (r.id, 'customer', 'paid', 'I''ve paid. Here is my receipt.', jsonb_build_object('receipt_id', rid));
end;
$$;

revoke all on function public.shor_mark_paid(uuid, text, text) from public;
grant execute on function public.shor_mark_paid(uuid, text, text) to anon, authenticated;

commit;
