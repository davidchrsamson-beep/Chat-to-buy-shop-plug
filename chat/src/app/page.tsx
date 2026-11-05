import type { Metadata } from "next";
import ChatApp from "@/components/ChatApp";
import type { Delivery } from "@/components/DeliveredCarousel";
import { BRAND, TAGLINE } from "@/lib/brand";
import { db } from "@/lib/supabase";

// What shows when the link is shared (WhatsApp, Instagram, etc.) and on the browser tab.
export const metadata: Metadata = {
  title: `${BRAND} · ${TAGLINE}`,
  description: "Tell your plug what you need in Calabar. Get your bill in the chat, pay by transfer, and a plug delivers, day or late night.",
  openGraph: {
    title: BRAND,
    description: TAGLINE,
    images: ["/delivered/hair.jpg"],
  },
};

// Changes made on the team dashboard show up here within a minute.
export const revalidate = 60;

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

export default async function Home() {
  return <ChatApp deliveries={await loadStrip()} />;
}
