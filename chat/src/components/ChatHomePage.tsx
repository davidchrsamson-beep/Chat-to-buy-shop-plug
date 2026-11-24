import ChatApp from "@chat/components/ChatApp";
import type { Delivery } from "@chat/components/DeliveredCarousel";
import { db } from "@chat/lib/supabase";

type StripRow = { item: string; area: string; when_text: string; ask: string; image_url: string; video_url: string | null };

async function loadStrip(): Promise<Delivery[]> {
  const { data, error } = await db()
    .from("shor_strip")
    .select("item, area, when_text, ask, image_url, video_url")
    .eq("active", true)
    .order("sort_order")
    .limit(30);
  if (error) {
    console.error("Photo strip load failed:", error.code, error.message);
    return [];
  }
  return ((data ?? []) as StripRow[]).map((r) => ({
    item: r.item,
    area: r.area,
    when: r.when_text,
    ask: r.ask || `I need ${r.item.toLowerCase()} delivered, please`,
    image: r.image_url,
    video: r.video_url,
  }));
}

export default async function ChatHomePage() {
  return <ChatApp deliveries={await loadStrip()} />;
}
