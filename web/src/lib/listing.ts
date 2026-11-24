import type { DbClient } from "@/lib/vendor";
import { formatDay } from "@/lib/price";

export type Plan = { months: number; priceKobo: number };

export type ListingStatus = {
  listed: boolean;
  reason: "launch" | "paid" | "grace" | "unlisted";
  until: string | null; // when listing ends (before grace)
  graceUntil: string | null; // the very last moment they stay listed
  plans: Plan[];
};

const DAY = 86_400_000;

// Works out whether a store shows in errand search and the main market,
// and until when. Mirrors the database rule `vendor_is_listed`.
export async function getListingStatus(supabase: DbClient, vendorId: string): Promise<ListingStatus> {
  const [{ data: settings }, { data: sub }] = await Promise.all([
    supabase.from("settings").select("key, value").in("key", ["listing_plans", "launch_free_until", "grace_days"]),
    supabase
      .from("subscriptions")
      .select("ends_at, grace_ends_at")
      .eq("vendor_id", vendorId)
      .eq("kind", "paid")
      .order("grace_ends_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const get = (key: string) => (settings ?? []).find((s) => s.key === key)?.value;
  const graceDays = Number(get("grace_days")) || 3;
  const plans: Plan[] = (Array.isArray(get("listing_plans")) ? get("listing_plans") : [])
    .map((p: { months: number; price_kobo: number }) => ({ months: Number(p.months), priceKobo: Number(p.price_kobo) }))
    .filter((p: Plan) => p.months > 0 && p.priceKobo > 0);

  const now = Date.now();

  if (sub && new Date(sub.grace_ends_at).getTime() > now) {
    const ended = new Date(sub.ends_at).getTime() <= now;
    return { listed: true, reason: ended ? "grace" : "paid", until: sub.ends_at, graceUntil: sub.grace_ends_at, plans };
  }

  const launch = get("launch_free_until");
  if (typeof launch === "string") {
    const end = new Date(launch).getTime();
    const graceEnd = end + graceDays * DAY;
    if (now <= graceEnd) {
      return {
        listed: true,
        reason: now <= end ? "launch" : "grace",
        until: launch,
        graceUntil: new Date(graceEnd).toISOString(),
        plans,
      };
    }
  }

  return { listed: false, reason: "unlisted", until: null, graceUntil: null, plans };
}

// Plain-language summary for the dashboard.
export function describeListing(s: ListingStatus): { tone: "good" | "warn" | "bad"; title: string; body: string } {
  if (s.reason === "launch" && s.until) {
    return {
      tone: "good",
      title: `Listed free until ${formatDay(s.until)}`,
      body: "Your products appear in Find a Plug search and the Shop Plug marketplace. Subscribe before then to stay listed.",
    };
  }
  if (s.reason === "paid" && s.until) {
    return { tone: "good", title: `Listed until ${formatDay(s.until)}`, body: "Your products appear in Find a Plug search and the Shop Plug marketplace." };
  }
  if (s.reason === "grace" && s.graceUntil) {
    return {
      tone: "warn",
      title: `Subscribe by ${formatDay(s.graceUntil)} to stay listed`,
      body: "After that, your products leave Find a Plug search and the Shop Plug marketplace. Your storefront link keeps working.",
    };
  }
  return {
    tone: "bad",
    title: "Not listed in search",
    body: "Your storefront link works, but buyers can't find you in Find a Plug or the Shop Plug marketplace. Subscribe to get listed.",
  };
}
