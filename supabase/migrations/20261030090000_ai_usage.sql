-- =====================================================================
-- Ndu — Part 2A: AI assistant usage (so costs can never run away)
-- =====================================================================
begin;

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  kind text not null check (kind in ('draft_products')),
  photos integer not null default 0 check (photos >= 0),
  created_at timestamptz not null default now()
);
create index ai_usage_vendor_idx on public.ai_usage (vendor_id, created_at);

alter table public.ai_usage enable row level security;

create policy "ai_usage: owner read" on public.ai_usage for select to authenticated
  using (vendor_id = public.my_vendor_id() or public.is_admin());
create policy "ai_usage: owner record" on public.ai_usage for insert to authenticated
  with check (vendor_id = public.my_vendor_id());

grant select, insert on public.ai_usage to authenticated;

-- How many photos each listed vendor can have the AI read per month (change any time).
insert into public.settings (key, value) values ('ai_monthly_photo_cap', '300')
on conflict (key) do nothing;

commit;
