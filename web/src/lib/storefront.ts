import { createClient } from "@/lib/supabase/server";
import type { TileProduct } from "@/components/store/ProductTile";

export type StoreVendor = {
  id: string;
  business_name: string;
  slug: string;
  whatsapp: string;
  neighbourhood: string | null;
  instagram: string | null;
  tiktok: string | null;
  tagline: string | null;
  story: string | null;
  special_offer: string | null;
  ticker_text: string | null;
  logo_url: string | null;
  hero_urls: string[];
  verified: boolean;
  delivers: boolean;
  delivery_areas: string[];
  delivery_note: string | null;
  open_24h: boolean;
  opens_at: string | null;
  closes_at: string | null;
  open_days: number[];
  standout: string | null;
};

const VENDOR_FIELDS =
  "id, business_name, slug, whatsapp, neighbourhood, instagram, tiktok, tagline, story, special_offer, ticker_text, logo_url, hero_urls, verified, " +
  "delivers, delivery_areas, delivery_note, open_24h, opens_at, closes_at, open_days, standout";

// Storefronts are free and public: any store that exists is shown (the database rules decide).
export async function loadStore(slug: string) {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select(VENDOR_FIELDS).eq("slug", slug).maybeSingle();
  return data ? { supabase, vendor: data as StoreVendor } : null;
}

type ProductRow = {
  id: string;
  name: string;
  price_type: string;
  price_kobo: number | null;
  price_max_kobo: number | null;
  negotiable: boolean;
  in_stock: boolean;
  subcategory_id: number | null;
  product_media: { url: string; sort_order: number }[];
};

export function toTile(p: ProductRow): TileProduct & { subcategory_id: number | null } {
  const cover = [...(p.product_media ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
  return {
    id: p.id,
    name: p.name,
    price_type: p.price_type,
    price_kobo: p.price_kobo,
    price_max_kobo: p.price_max_kobo,
    negotiable: p.negotiable,
    in_stock: p.in_stock,
    subcategory_id: p.subcategory_id,
    cover,
  };
}

export const TILE_FIELDS =
  "id, name, price_type, price_kobo, price_max_kobo, negotiable, in_stock, subcategory_id, product_media(url, sort_order)";

export type { ProductRow };
