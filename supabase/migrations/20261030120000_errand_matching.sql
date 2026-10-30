-- =====================================================================
-- Ndu — Part 2B: errand AI matching
--
-- 1. A richer search: finds products by what they are, by the STORE NAME,
--    or by product type (e.g. "wigs", "perfume"), and returns what the
--    fair-ranking needs (photo count, product type, price details).
-- 2. A safety limit on AI use in errand: per visitor per minute, and a
--    daily total, so costs can never run away. When the limit is reached,
--    errand quietly falls back to normal keyword search.
-- =====================================================================
begin;

-- ---------- 1. Search v2 ----------
create or replace function public.search_products_v2(q text, max_price_kobo bigint default null, max_results integer default 80)
returns table (
  product_id uuid,
  name text,
  description text,
  attributes jsonb,
  price_kobo bigint,
  price_max_kobo bigint,
  price_type text,
  negotiable boolean,
  price_confirmed_at timestamptz,
  created_at timestamptz,
  vendor_id uuid,
  business_name text,
  slug text,
  whatsapp text,
  verified boolean,
  subcategory_name text,
  category_slug text,
  photo_count integer,
  image_url text,
  match_kind text
)
language sql stable security invoker set search_path = '' as $$
  with query as (
    select websearch_to_tsquery('english', q) as en, websearch_to_tsquery('simple', q) as si
  ),
  base as (
    select p.id as pid, p.name::text as pname, p.description::text as pdesc, p.attributes,
           p.price_kobo::bigint as pk, p.price_max_kobo::bigint as pmk, p.price_type::text as pt,
           p.negotiable, p.price_confirmed_at, p.created_at,
           v.id as vid, v.business_name::text as bname, v.slug::text as vslug, v.whatsapp::text as wa, v.verified,
           s.name::text as sname, c.slug::text as cslug,
           (select count(*) from public.product_media m where m.product_id = p.id and m.type = 'image')::integer as photos,
           case
             when p.search @@ query.en then 'product'
             when to_tsvector('simple', v.business_name) @@ query.si then 'store'
             when to_tsvector('english', coalesce(s.name, '') || ' ' || coalesce(c.name, '')) @@ query.en then 'type'
           end as mk
    from public.products p
    join public.vendors v on v.id = p.vendor_id
    left join public.subcategories s on s.id = p.subcategory_id
    left join public.categories c on c.id = s.category_id
    cross join query
    where p.status = 'live' and p.deleted_at is null and p.in_stock
      and public.vendor_is_listed(v.id)
      and (max_price_kobo is null or p.price_kobo <= max_price_kobo)
  )
  select b.pid, b.pname, b.pdesc, b.attributes, b.pk, b.pmk, b.pt, b.negotiable, b.price_confirmed_at, b.created_at,
         b.vid, b.bname, b.vslug, b.wa, b.verified, b.sname, b.cslug, b.photos,
         (select m.url from public.product_media m
          where m.product_id = b.pid and m.type = 'image' order by m.sort_order limit 1),
         b.mk
  from base b
  where b.mk is not null and b.photos >= public.min_search_photos()
  limit greatest(1, least(max_results, 150));
$$;

grant execute on function public.search_products_v2(text, bigint, integer) to anon, authenticated;

-- ---------- 2. AI safety limit for errand ----------
create table if not exists public.chat_ai_calls (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_ai_calls_time_idx on public.chat_ai_calls (created_at);
create index if not exists chat_ai_calls_ip_idx on public.chat_ai_calls (ip_hash, created_at);

-- No policies: nobody can read or write this table directly, only the function below.
alter table public.chat_ai_calls enable row level security;

insert into public.settings (key, value) values
  ('chat_ai_per_minute', '6'),     -- AI searches per visitor per minute
  ('chat_ai_daily_cap', '3000')    -- AI searches per day across everyone
on conflict (key) do nothing;

-- Returns true (and counts the call) if this visitor may use the AI right now.
create or replace function public.chat_ai_allow(p_ip_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  per_min integer := coalesce((select (value #>> '{}')::integer from public.settings where key = 'chat_ai_per_minute'), 6);
  daily integer := coalesce((select (value #>> '{}')::integer from public.settings where key = 'chat_ai_daily_cap'), 3000);
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 or length(p_ip_hash) > 128 then
    return false;
  end if;
  if (select count(*) from public.chat_ai_calls
      where ip_hash = p_ip_hash and created_at > now() - interval '1 minute') >= per_min then
    return false;
  end if;
  if (select count(*) from public.chat_ai_calls where created_at > now() - interval '1 day') >= daily then
    return false;
  end if;
  insert into public.chat_ai_calls (ip_hash) values (p_ip_hash);
  delete from public.chat_ai_calls where created_at < now() - interval '2 days'; -- keeps the table tiny
  return true;
end;
$$;

revoke all on function public.chat_ai_allow(text) from public;
grant execute on function public.chat_ai_allow(text) to anon, authenticated;

commit;
