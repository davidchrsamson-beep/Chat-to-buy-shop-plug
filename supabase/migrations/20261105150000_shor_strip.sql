-- =====================================================================
-- Shor plug — the home-screen photo strip, managed from the team dashboard
-- (order, captions, show/hide, new photos). Anyone can see the cards that are
-- switched on; only the team can change them.
-- =====================================================================
begin;

create table if not exists public.shor_strip (
  id uuid primary key default gen_random_uuid(),
  item text not null check (char_length(item) between 1 and 60),
  area text not null default '' check (char_length(area) <= 40),
  when_text text not null default '' check (char_length(when_text) <= 40),
  ask text not null default '' check (char_length(ask) <= 120),
  image_url text not null check (image_url ~ '^(/delivered/|https://)'),
  video_url text check (video_url is null or video_url ~ '^(/delivered/|https://)'),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shor_strip_order_idx on public.shor_strip (sort_order);

alter table public.shor_strip enable row level security;

drop policy if exists "shor_strip: public read" on public.shor_strip;
create policy "shor_strip: public read" on public.shor_strip for select to anon, authenticated
  using (active or public.is_team());
drop policy if exists "shor_strip: team add" on public.shor_strip;
create policy "shor_strip: team add" on public.shor_strip for insert to authenticated with check (public.is_team());
drop policy if exists "shor_strip: team change" on public.shor_strip;
create policy "shor_strip: team change" on public.shor_strip for update to authenticated
  using (public.is_team()) with check (public.is_team());
drop policy if exists "shor_strip: team remove" on public.shor_strip;
create policy "shor_strip: team remove" on public.shor_strip for delete to authenticated using (public.is_team());

grant select on public.shor_strip to anon, authenticated;
grant insert, update, delete on public.shor_strip to authenticated;

-- The current cards, in the order asked for (only added if the strip is empty).
insert into public.shor_strip (item, area, when_text, ask, image_url, video_url, sort_order)
select * from (values
  ('Suya & sausage', 'State Housing', 'last night', 'I want suya delivered tonight, please', '/delivered/suya-night.jpg', '/delivered/suya-night.mp4', 10),
  ('Fresh yoghurt', 'Parliamentary', 'earlier this morning', 'I need fresh yoghurt delivered, please', '/delivered/yoghurt.jpg', null, 20),
  ('Crates of eggs', 'Ateko
  ng', 'yesterday', 'I need crates of eggs delivered, please', '/delivered/eggs.jpg', null, 30),
  ('Perfumes & body splash', 'Satellite Town', 'yesterday evening', 'I need perfume delivered, please', '/delivered/perfume-bag.jpg', null, 40),
  ('Human hair bundle', 'Marian', 'earlier this morning', 'I need human hair delivered, please', '/delivered/hair.jpg', null, 50),
  ('Suya, hot off the grill', 'Atimbo', 'yesterday night', 'I want suya delivered, please', '/delivered/suya-day.jpg', '/delivered/suya-day.mp4', 60)
) as v(item, area, when_text, ask, image_url, video_url, sort_order)
where not exists (select 1 from public.shor_strip);

commit;
