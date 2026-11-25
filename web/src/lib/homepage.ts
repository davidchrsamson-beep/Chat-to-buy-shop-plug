import { createClient } from "@/lib/supabase/server";

export type HomepageStore = {
  id: string;
  business_name: string;
  slug: string;
  neighbourhood: string | null;
  logo_url: string | null;
  hero_urls: string[];
  verified: boolean;
};

export type HomepageDelivery = {
  id: string;
  item: string;
  area: string;
  when_text: string;
  ask: string;
  image_url: string;
  video_url: string | null;
};

export async function loadHomepageData() {
  const supabase = await createClient();
  const [storesResult, deliveriesResult] = await Promise.all([
    supabase.from("live_vendors")
      .select("id, business_name, slug, neighbourhood, logo_url, hero_urls, verified")
      .order("created_at", { ascending: false })
      .limit(16),
    supabase.from("shor_strip")
      .select("id, item, area, when_text, ask, image_url, video_url")
      .eq("active", true)
      .order("sort_order")
      .limit(20),
  ]);

  if (storesResult.error) console.error("Homepage stores failed:", storesResult.error.code);
  if (deliveriesResult.error) console.error("Homepage deliveries failed:", deliveriesResult.error.code);

  return {
    stores: (storesResult.data ?? []) as HomepageStore[],
    deliveries: (deliveriesResult.data ?? []) as HomepageDelivery[],
  };
}
