import type { Metadata } from "next";
import { BRAND, TAGLINE } from "@chat/lib/brand";
import { appPath } from "@chat/lib/paths";
import ChatHomePage from "@chat/components/ChatHomePage";

// What shows when the link is shared (WhatsApp, Instagram, etc.) and on the browser tab.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.URL ?? "http://localhost:3001"),
  title: `${BRAND} · ${TAGLINE}`,
  description: "Tell your plug what you need in Calabar. Get your bill in the chat, pay by transfer, and a plug delivers, day or late night.",
  openGraph: {
    title: BRAND,
    description: TAGLINE,
    images: [appPath("/delivered/hair.jpg")],
  },
};

export const revalidate = 60;

export default async function Home() {
  return <ChatHomePage />;
}
