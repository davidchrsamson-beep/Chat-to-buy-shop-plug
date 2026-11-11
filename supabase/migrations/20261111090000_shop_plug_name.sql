-- The brand is now "Shop Plug": update the delivery-status messages customers see in the chat.
-- (Internal table names starting with shor_ stay as they are; customers never see them.)
begin;

create or replace function public.shor_team_status(p_request uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  note text := case p_status
    when 'paid' then 'Payment confirmed. Your plug is getting your order now.'
    when 'on_the_way' then 'Your plug is on the way and will call you shortly.'
    when 'delivered' then 'Delivered. Thank you for using Shop Plug!'
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

revoke all on function public.shor_team_status(uuid, text) from public;
grant execute on function public.shor_team_status(uuid, text) to authenticated;

commit;
