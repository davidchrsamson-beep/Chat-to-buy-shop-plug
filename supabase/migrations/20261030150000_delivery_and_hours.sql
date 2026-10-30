-- =====================================================================
-- Ndu — Part 2D: delivery areas, opening hours, "what makes you different"
--
-- errand's strength is the hard-to-find and the urgent: "Baileys delivered to
-- Marian by 1am", "yogurt culture around Atekong". To match those, each store
-- says where it delivers, when it's open, and what makes it stand out.
-- =====================================================================
begin;

alter table public.vendors
  add column if not exists delivers boolean not null default false,
  add column if not exists delivery_areas text[] not null default '{}'
    check (cardinality(delivery_areas) <= 40),
  add column if not exists delivery_note text check (char_length(delivery_note) <= 140),
  add column if not exists open_24h boolean not null default false,
  add column if not exists opens_at time,
  add column if not exists closes_at time,
  -- 0 = Sunday … 6 = Saturday
  add column if not exists open_days smallint[] not null default '{0,1,2,3,4,5,6}',
  add column if not exists standout text check (char_length(standout) <= 140);

-- Public store details (anyone can read them; only the owner can change them — the row rules still apply).
grant select (delivers, delivery_areas, delivery_note, open_24h, opens_at, closes_at, open_days, standout, ticker_text)
  on public.vendors to anon, authenticated;
grant update (delivers, delivery_areas, delivery_note, open_24h, opens_at, closes_at, open_days, standout, ticker_text)
  on public.vendors to authenticated;

-- ---------- errand search v3: also returns delivery + hours, and can match what a store says about itself ----------
create or replace function public.search_products_v3(q text, max_price_kobo bigint default null, max_results integer default 120)
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
  neighbourhood text,
  delivers boolean,
  delivery_areas text[],
  delivery_note text,
  open_24h boolean,
  opens_at text,
  closes_at text,
  open_days integer[],
  standout text,
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
           v.neighbourhood::text as hood, v.delivers, v.delivery_areas, v.delivery_note, v.open_24h,
           v.opens_at::text as opens, v.closes_at::text as closes, v.open_days::integer[] as days, v.standout,
           s.name::text as sname, c.slug::text as cslug,
           (select count(*) from public.product_media m where m.product_id = p.id and m.type = 'image')::integer as photos,
           case
             when p.search @@ query.en then 'product'
             when to_tsvector('simple', v.business_name) @@ query.si then 'store'
             when to_tsvector('english', coalesce(s.name, '') || ' ' || coalesce(c.name, '')) @@ query.en then 'type'
             when to_tsvector('english', coalesce(v.tagline, '') || ' ' || coalesce(v.story, '') || ' ' || coalesce(v.standout, ''))
                  @@ query.en then 'about'
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
         b.vid, b.bname, b.vslug, b.wa, b.verified, b.hood, b.delivers, b.delivery_areas, b.delivery_note, b.open_24h,
         b.opens, b.closes, b.days, b.standout, b.sname, b.cslug, b.photos,
         (select m.url from public.product_media m
          where m.product_id = b.pid and m.type = 'image' order by m.sort_order limit 1),
         b.mk
  from base b
  where b.mk is not null and b.photos >= public.min_search_photos()
  limit greatest(1, least(max_results, 150));
$$;

grant execute on function public.search_products_v3(text, bigint, integer) to anon, authenticated;

commit;
