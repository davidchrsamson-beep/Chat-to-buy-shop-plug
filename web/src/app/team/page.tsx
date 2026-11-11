import type { Metadata } from "next";
import { redirect } from "next/navigation";
import TeamGate from "@/components/team/TeamGate";
import TeamInbox from "@/components/team/TeamInbox";
import { teamAccess } from "@/lib/team";

export const metadata: Metadata = { title: "Shop Plug inbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The Shop Plug team inbox: customers' requests, replies, bills and delivery status.
export default async function TeamPage() {
  const { supabase, state, email } = await teamAccess();
  if (state === "login") redirect("/vendor/login");
  if (state !== "ok") return <TeamGate state={state} email={email} />;

  const { data: pricingRow } = await supabase.from("settings").select("value").eq("key", "shor_pricing").maybeSingle();
  const p = (pricingRow?.value ?? {}) as Record<string, unknown>;
  const fares = Array.isArray(p.fares_kobo) ? (p.fares_kobo as number[]).map(Number).filter((n) => n > 0) : [60000, 70000, 100000, 150000];

  return (
    <TeamInbox
      pricing={{
        faresKobo: fares,
        lateKobo: Number(p.late_night_kobo) || 50000,
        bulkyKobo: Number(p.bulky_kobo) || 20000,
        commissionKobo: Number(p.commission_kobo) || 10000,
      }}
    />
  );
}
