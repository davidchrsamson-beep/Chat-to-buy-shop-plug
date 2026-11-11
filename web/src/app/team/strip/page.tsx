import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StripManager from "@/components/team/StripManager";
import TeamGate from "@/components/team/TeamGate";
import { teamAccess } from "@/lib/team";
import { listStrip } from "./actions";

export const metadata: Metadata = { title: "Shop Plug photo strip", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Arrange the photo strip on the Shop Plug home screen.
export default async function StripPage() {
  const { state, email } = await teamAccess();
  if (state === "login") redirect("/vendor/login");
  if (state !== "ok") return <TeamGate state={state} email={email} />;

  return <StripManager initial={await listStrip()} shorUrl={(process.env.NEXT_PUBLIC_SHOR_URL ?? "https://nduchat.netlify.app").replace(/\/$/, "")} />;
}
