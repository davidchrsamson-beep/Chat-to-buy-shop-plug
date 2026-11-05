import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import TeamInbox from "@/components/team/TeamInbox";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shor plug inbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The Shor plug team inbox: customers' requests, replies, bills and delivery status.
export default async function TeamPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/vendor/login");

  const { data: isTeam, error: teamError } = await supabase.rpc("is_team");
  if (teamError) {
    console.error("Team check failed:", teamError.code, teamError.message);
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-xl font-bold">The Shor plug inbox isn&apos;t set up yet</h1>
        <p className="mt-2 text-sm text-gray-600">
          Run the Shor plug SQL file in Supabase (20261105090000_shor_plug_requests.sql), then refresh this page.
        </p>
      </main>
    );
  }
  if (!isTeam) {
    return (
      <main className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-xl font-bold">This page is for the Shor plug team</h1>
        <p className="mt-2 text-sm text-gray-600">
          Your account isn&apos;t on the team list yet. Add it in Supabase (SQL Editor) with the team_members command from the guide,
          then refresh this page.
        </p>
        <Link href="/vendor/dashboard" className="mt-6 inline-block font-semibold text-brand">Go to my dashboard</Link>
      </main>
    );
  }

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
