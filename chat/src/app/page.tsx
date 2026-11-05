import type { Metadata } from "next";
import ChatApp from "@/components/ChatApp";
import { BRAND, TAGLINE } from "@/lib/brand";

// What shows when the link is shared (WhatsApp, Instagram, etc.) and on the browser tab.
export const metadata: Metadata = {
  title: `${BRAND} · ${TAGLINE}`,
  description: "Tell your plug what you need in Calabar. Get your bill in the chat, pay by transfer, and a plug delivers, day or late night.",
  openGraph: {
    title: BRAND,
    description: TAGLINE,
    images: ["/examples/baileys.jpg"],
  },
};

export default function Home() {
  return <ChatApp />;
}
