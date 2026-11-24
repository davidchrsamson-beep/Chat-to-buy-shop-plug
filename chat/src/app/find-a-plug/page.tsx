import type { Metadata } from "next";
import ChatHomePage from "@chat/components/ChatHomePage";

export const metadata: Metadata = {
  title: "Find a Plug · Shop Plug",
  description: "Tell your plug what you need in Calabar. Transportation starts at ₦600.",
};

export const revalidate = 60;

export default async function FindAPlugPage() {
  return <ChatHomePage />;
}
