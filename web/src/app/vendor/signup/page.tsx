import type { Metadata } from "next";
import Link from "next/link";
import { logOutForNewStore } from "./session";
import AuthShell from "@/components/vendor/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { formatDay } from "@/lib/price";
import SignupWizard, { type SignupCategory } from "./SignupWizard";

export const metadata: Metadata = { title: "Vendor sign-up — Shop Plug" };

type SubRow = { id: number; name: string; sort_order: number };

export default async function SignupPage() {
  const supabase = await createClient();

  // Already logged in: say so, instead of a confusing form.
  const { data: auth } = await supabase.auth.getClaims();
  if (auth?.claims) {
    const { data: store } = await supabase
      .from("vendors")
      .select("business_name")
      .eq("owner_id", auth.claims.sub)
      .is("deleted_at", null)
      .maybeSingle();
    return (
      <AuthShell>
        <div className="mt-8 space-y-4 text-center">
          <h1 className="text-2xl font-bold">Open your free store on Shop Plug</h1>
          <p className="text-sm text-gray-600">
            You&apos;re logged in{store?.business_name ? <> as <strong>{store.business_name}</strong></> : null} on this device.
          </p>
          <Link
            href="/vendor/dashboard"
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-brand font-semibold text-white hover:bg-brand-dark"
          >
            Go to my dashboard
          </Link>
          <form action={logOutForNewStore}>
            <button type="submit" className="min-h-12 w-full rounded-xl border border-gray-200 font-semibold text-gray-700 hover:border-gray-300">
              Log out and open a new store
            </button>
          </form>
        </div>
      </AuthShell>
    );
  }

  const [cats, settings] = await Promise.all([
    supabase.from("categories").select("id, slug, name, subcategories(id, name, sort_order)").order("sort_order"),
    supabase.from("settings").select("key, value").in("key", ["listing_plans", "launch_free_until"]),
  ]);

  if (cats.error || settings.error) {
    console.error("Sign-up page failed to load:", cats.error?.message ?? settings.error?.message);
    return (
      <AuthShell>
        <p role="alert" className="mt-10 text-center text-sm text-red-600">
          We couldn&apos;t load the sign-up form. Please refresh the page.
        </p>
      </AuthShell>
    );
  }

  const categories: SignupCategory[] = (cats.data ?? []).map((c) => ({
    id: c.id as number,
    slug: c.slug as string,
    name: c.name as string,
    subcategories: ((c.subcategories ?? []) as unknown as SubRow[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ id, name }) => ({ id, name })),
  }));

  // Listing offer shown on the last step.
  const get = (key: string) => (settings.data ?? []).find((s) => s.key === key)?.value;
  const launch = get("launch_free_until");
  const launchActive = typeof launch === "string" && Date.now() <= new Date(launch).getTime();
  const plans = (Array.isArray(get("listing_plans")) ? get("listing_plans") : []) as { months: number; price_kobo: number }[];
  const monthly = plans.find((p) => Number(p.months) === 1)?.price_kobo ?? 150000;

  return (
    <AuthShell>
      <SignupWizard
        categories={categories}
        offer={{ freeListingUntil: launchActive ? formatDay(launch as string) : null, monthlyKobo: Number(monthly) }}
      />
    </AuthShell>
  );
}
