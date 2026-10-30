-- =====================================================================
-- Ndu — Part 1: free storefronts, paid listing, richer products
--
-- 1. Storefronts are free forever: every store's page is public.
-- 2. Appearing in errand search and the main market is paid
--    (₦1,500 / 1 month, ₦3,000 / 2 months, ₦8,500 / 6 months).
--    Launch offer: everyone is listed free until 30 November (+3 grace days).
-- 3. Products get price types, "negotiable", stock, details per category.
-- 4. Search only shows products with at least 3 photos (changeable in settings).
-- =====================================================================
begin;

-- ---------- Settings: new pricing, launch offer, photo rule ----------
delete from public.settings where key in ('price_kobo', 'period_days', 'trial_days');

insert into public.settings (key, value) values
  ('listing_plans', '[{"months":1,"price_kobo":150000},{"months":2,"price_kobo":300000},{"months":6,"price_kobo":850000}]'),
  ('launch_free_until', '"2026-11-30T23:59:59+01:00"'),
  ('grace_days', '3'),
  ('min_search_photos', '3')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- No more automatic 14-day trials: the storefront itself is free.
drop trigger if exists vendors_start_trial on public.vendors;

-- ---------- Is this store listed in search and the market right now? ----------
create or replace function public.vendor_is_listed(v_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vendors v where v.id = v_id and v.deleted_at is null)
  and (
    -- Launch offer (everyone), including the grace days after it ends
    now() <= (
      select (l.value #>> '{}')::timestamptz
             + make_interval(days => coalesce((select (g.value #>> '{}')::integer from public.settings g where g.key = 'grace_days'), 3))
      from public.settings l where l.key = 'launch_free_until'
    )
    -- Or a paid listing period (its grace days are stored on the row)
    or exists (
      select 1 from public.subscriptions s
      where s.vendor_id = v_id and s.kind = 'paid'
        and s.starts_at <= now() and s.grace_ends_at > now()
    )
  );
$$;

create or replace function public.min_search_photos()
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce((select (value #>> '{}')::integer from public.settings where key = 'min_search_photos'), 3);
$$;

alter table public.subscriptions add column if not exists months smallint check (months between 1 and 24);

-- ---------- Products: price types, negotiable, stock, details ----------
create type public.price_type as enum ('fixed', 'from', 'range', 'ask');

alter table public.products
  add column price_type public.price_type not null default 'fixed',
  add column price_max_kobo bigint check (price_max_kobo is null or price_max_kobo > 0),
  add column negotiable boolean not null default false,
  add column in_stock boolean not null default true,
  add column price_confirmed_at timestamptz not null default now(),
  add column attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object');

-- "Ask for price" products have no price; every other type must have one.
alter table public.products alter column price_kobo drop not null;
alter table public.products add constraint products_price_present
  check (price_type = 'ask' or price_kobo is not null);
alter table public.products add constraint products_range_valid
  check (price_type <> 'range' or (price_max_kobo is not null and price_max_kobo >= price_kobo));

-- Search text now includes details like colour and size.
alter table public.products drop column search;
alter table public.products add column search tsvector generated always as (
  to_tsvector('english', name || ' ' || coalesce(description, ''))
  || jsonb_to_tsvector('english', attributes, '["string"]')
) stored;
create index products_search_idx on public.products using gin (search);

-- ---------- Who can see what (storefronts free, listing paid) ----------
drop policy if exists "vendors: public read live" on public.vendors;
create policy "vendors: public read" on public.vendors for select to anon, authenticated
  using (deleted_at is null);

drop policy if exists "products: public read live" on public.products;
create policy "products: public read" on public.products for select to anon, authenticated
  using (
    status = 'live' and deleted_at is null
    and exists (select 1 from public.vendors v where v.id = vendor_id and v.deleted_at is null)
  );

drop policy if exists "editorial: public read" on public.editorial_posts;
create policy "editorial: public read" on public.editorial_posts for select to anon, authenticated
  using (published and deleted_at is null and public.vendor_is_listed(vendor_id));

drop policy if exists "visits: record" on public.visits;
create policy "visits: record" on public.visits for insert to anon, authenticated
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.deleted_at is null));

drop policy if exists "leads: record" on public.leads;
create policy "leads: record" on public.leads for insert to anon, authenticated
  with check (exists (select 1 from public.vendors v where v.id = vendor_id and v.deleted_at is null));

-- The market's list of stores = listed stores only.
create or replace view public.live_vendors with (security_invoker = on) as
select id, business_name, slug, neighbourhood, logo_url, hero_urls, tagline, verified, created_at
from public.vendors
where deleted_at is null and public.vendor_is_listed(id);

-- ---------- errand search: listed stores, live, in stock, 3+ photos ----------
create or replace function public.search_products(q text, max_price_kobo bigint default null, max_results integer default 60)
returns table (
  product_id uuid,
  name text,
  description text,
  price_kobo bigint,
  price_max_kobo bigint,
  price_type text,
  negotiable boolean,
  created_at timestamptz,
  vendor_id uuid,
  business_name text,
  slug text,
  whatsapp text,
  verified boolean,
  image_url text
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.name, p.description, p.price_kobo, p.price_max_kobo, p.price_type::text, p.negotiable, p.created_at,
         v.id, v.business_name, v.slug, v.whatsapp, v.verified,
         (select m.url from public.product_media m
          where m.product_id = p.id and m.type = 'image' order by m.sort_order limit 1)
  from public.products p
  join public.vendors v on v.id = p.vendor_id
  where p.status = 'live' and p.deleted_at is null and p.in_stock
    and public.vendor_is_listed(v.id)
    and (max_price_kobo is null or p.price_kobo <= max_price_kobo)
    and p.search @@ websearch_to_tsquery('english', q)
    and (select count(*) from public.product_media m
         where m.product_id = p.id and m.type = 'image') >= public.min_search_photos()
  limit greatest(1, least(max_results, 100));
$$;

grant execute on function public.search_products(text, bigint, integer) to anon, authenticated;
grant execute on function public.vendor_is_listed(uuid) to anon, authenticated;
grant execute on function public.min_search_photos() to anon, authenticated;

commit;
