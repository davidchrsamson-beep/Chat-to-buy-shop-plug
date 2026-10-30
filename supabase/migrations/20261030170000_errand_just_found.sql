-- =====================================================================
-- Ndu — Part 2F: errand's "Just found" live feed
--
-- Privacy: we never store or show what a buyer typed. We only record WHICH
-- public product errand found (already visible on the vendor's storefront)
-- and, optionally, the Calabar area. The feed reads e.g.
-- "Baileys Irish Cream 1L · Marian · 3 min ago".
-- =====================================================================
begin;

create table if not exists public.chat_finds (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products (id) on delete cascade,
  area text,
  created_at timestamptz not null default now()
);
create index if not exists chat_finds_time_idx on public.chat_finds (created_at desc);
create index if not exists chat_finds_product_idx on public.chat_finds (product_id, created_at desc);

-- No policies: nobody reads or writes the table directly, only the two functions below.
alter table public.chat_finds enable row level security;

-- Called by errand after a successful search. Only live products count, an area must look
-- like a place name, and the same product is counted at most once every 10 minutes (no spamming the feed).
create or replace function public.record_find(p_product_id uuid, p_area text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.chat_finds
             where product_id = p_product_id and created_at > now() - interval '10 minutes') then
    return;
  end if;
  insert into public.chat_finds (product_id, area)
  select p.id, case when p_area ~ '^[A-Za-z0-9 ]{2,30}$' then p_area end
  from public.products p
  where p.id = p_product_id and p.status = 'live' and p.deleted_at is null;
  delete from public.chat_finds where created_at < now() - interval '3 days'; -- keeps the table tiny
end;
$$;

-- The feed: the latest finds of the last 24 hours, one per product, from listed stores only.
create or replace function public.recent_finds(max_items integer default 12)
returns table (product_id uuid, product_name text, vendor_slug text, area text, found_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.product_id, x.product_name, x.vendor_slug, x.area, x.found_at
  from (
    select distinct on (f.product_id)
           f.product_id, p.name::text as product_name, v.slug::text as vendor_slug, f.area, f.created_at as found_at
    from public.chat_finds f
    join public.products p on p.id = f.product_id and p.status = 'live' and p.deleted_at is null
    join public.vendors v on v.id = p.vendor_id
    where f.created_at > now() - interval '24 hours' and public.vendor_is_listed(v.id)
    order by f.product_id, f.created_at desc
  ) x
  order by x.found_at desc
  limit greatest(1, least(max_items, 30));
$$;

revoke all on function public.record_find(uuid, text) from public;
revoke all on function public.recent_finds(integer) from public;
grant execute on function public.record_find(uuid, text) to anon, authenticated;
grant execute on function public.recent_finds(integer) to anon, authenticated;

commit;
