import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentVendor = {
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

export type DbClient = Awaited<ReturnType<typeof createClient>>;

// Every vendor page starts here: who is logged in, and which store is theirs.
// Logged-out visitors are sent to the login page.
export async function requireVendor() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/vendor/login");

  const { data, error } = await supabase
    .from("vendors")
    .select(
      "id, business_name, slug, whatsapp, neighbourhood, instagram, tiktok, tagline, story, special_offer, ticker_text, logo_url, hero_urls, verified, " +
        "delivers, delivery_areas, delivery_note, open_24h, opens_at, closes_at, open_days, standout",
    )
    .eq("owner_id", auth.claims.sub)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) console.error("Store load failed:", error.code, error.message);
  if (error) throw new Error("We couldn't load your store. Please refresh the page.");
  return {
    supabase,
    vendor: data as CurrentVendor | null,
    email: (auth.claims.email as string | undefined) ?? null,
  };
}

export type CategoryOption = {
  slug: string;
  name: string;
  subcategories: { id: number; name: string }[];
};

// The categories and product types this store chose at sign-up.
export async function loadCategoryOptions(supabase: DbClient, vendorId: string): Promise<CategoryOption[]> {
  const { data } = await supabase
    .from("vendor_categories")
    .select("category:categories(slug, name, sort_order, subcategories(id, name, sort_order))")
    .eq("vendor_id", vendorId);

  type Row = {
    category: {
      slug: string;
      name: string;
      sort_order: number;
      subcategories: { id: number; name: string; sort_order: number }[];
    } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .map((r) => r.category)
    .filter((c): c is NonNullable<Row["category"]> => c !== null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      subcategories: [...c.subcategories]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(({ id, name }) => ({ id, name })),
    }));
}

export async function loadMinSearchPhotos(supabase: DbClient): Promise<number> {
  const { data } = await supabase.from("settings").select("value").eq("key", "min_search_photos").maybeSingle();
  const n = Number(data?.value);
  return Number.isInteger(n) && n > 0 ? n : 3;
}
