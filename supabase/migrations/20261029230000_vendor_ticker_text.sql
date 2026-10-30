-- The moving display line on each storefront ("We are the coziest gift shop in Calabar").
begin;
alter table public.vendors
  add column if not exists ticker_text text check (char_length(ticker_text) <= 80);
commit;
