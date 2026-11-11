-- Shor Plug photo strip: captions in the "WHEN • / WHAT delivered to WHERE" style.
begin;
update public.shor_strip set item = '5k suya', when_text = 'Last night' where image_url = '/delivered/suya-night.jpg';
update public.shor_strip set item = 'Fresh yoghurt', when_text = 'Today' where image_url = '/delivered/yoghurt.jpg';
update public.shor_strip set item = 'Crates of eggs', when_text = 'Today' where image_url = '/delivered/eggs.jpg';
update public.shor_strip set item = 'Perfumes and body splash', when_text = 'Yesterday' where image_url = '/delivered/perfume-bag.jpg';
update public.shor_strip set item = 'Human hair bundle', when_text = 'Today' where image_url = '/delivered/hair.jpg';
update public.shor_strip set item = 'Suya', when_text = 'Yesterday' where image_url = '/delivered/suya-day.jpg';
commit;
