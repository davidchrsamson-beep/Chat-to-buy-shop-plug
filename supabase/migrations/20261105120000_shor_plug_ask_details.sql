-- =====================================================================
-- Shor plug — you run the conversation
-- The customer's chat no longer asks for their details automatically.
-- Instead, you tap "Ask for delivery details" in the inbox when you're ready,
-- and the customer gets a small form (name, phone, address) in the chat.
-- =====================================================================
begin;

alter table public.shor_messages drop constraint if exists shor_messages_kind_check;
alter table public.shor_messages add constraint shor_messages_kind_check
  check (kind in ('text', 'quote', 'paid', 'status', 'ask_details'));

create or replace function public.shor_team_ask_details(p_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_team() then raise exception 'not allowed'; end if;
  insert into public.shor_messages (request_id, sender, kind, body)
  values (p_request, 'team', 'ask_details', 'Where should your plug bring it, and how can they call you?');
  update public.shor_requests set last_team_at = now(), team_seen_at = now(), updated_at = now() where id = p_request;
end;
$$;

revoke all on function public.shor_team_ask_details(uuid) from public;
grant execute on function public.shor_team_ask_details(uuid) to authenticated;

commit;
