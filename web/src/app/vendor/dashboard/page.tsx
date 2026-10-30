import Link from "next/link";
import CopyLink from "@/components/vendor/CopyLink";
import DashboardShell from "@/components/vendor/DashboardShell";
import { describeListing, getListingStatus } from "@/lib/listing";
import { loadMinSearchPhotos, requireVendor } from "@/lib/vendor";
import { signOut, signOutEverywhere } from "../actions";

const TONE = {
  good: "border-brand/30 bg-brand-tint text-brand-dark",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-800",
};

export default async function DashboardPage() {
  const { supabase, vendor, email } = await requireVendor();
    if (!vendor) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          We couldn&apos;t find a store on this account. Please contact Ndu support.
        </p>
        <form action={signOut} className="mt-6">
          <button className="min-h-11 rounded-xl border border-gray-200 px-5 font-semibold hover:border-brand">
            Log out
          </button>
        </form>
      </div>
    );
  }

  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [listing, minPhotos, products, visits, leads] = await Promise.all([
    getListingStatus(supabase, vendor.id),
    loadMinSearchPhotos(supabase),
    supabase.from("products").select("id, status, product_media(count)").eq("vendor_id", vendor.id).is("deleted_at", null),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).gte("created_at", since),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("vendor_id", vendor.id).gte("created_at", since),
  ]);

  type Row = { status: string; product_media: { count: number }[] };
  const rows = (products.data ?? []) as unknown as Row[];
  const live = rows.filter((r) => r.status === "live");
  const searchable = live.filter((r) => (r.product_media?.[0]?.count ?? 0) >= minPhotos);
  const status = describeListing(listing);

  const todo = [
    { done: Boolean(vendor.logo_url) && vendor.hero_urls.length > 0, text: "Add your logo and cover photos", href: "/vendor/settings" },
    { done: live.length >= 3, text: "Publish at least 3 products", href: "/vendor/products/new" },
    {
      done: live.length > 0 && searchable.length === live.length,
      text: `Give every product ${minPhotos}+ photos from different angles, so it can appear in search`,
      href: "/vendor/products",
    },
  ];

  return (
    <DashboardShell active="overview" storeName={vendor.business_name}>
      <h1 className="text-2xl font-bold">Welcome, {vendor.business_name} 👋</h1>

      <div className={`mt-4 rounded-2xl border p-4 ${TONE[status.tone]}`}>
        <p className="font-semibold">{status.title}</p>
        <p className="mt-1 text-sm">{status.body}</p>
        {status.tone !== "good" && (
          <Link href="/vendor/listing" className="mt-3 inline-block text-sm font-semibold underline">See listing plans</Link>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Your free storefront link, for your bio and WhatsApp status</p>
        <CopyLink path={`/s/${vendor.slug}`} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Live products" value={live.length} />
        <Stat label="In search" value={searchable.length} />
        <Stat label="Store visits (7 days)" value={visits.count ?? 0} />
        <Stat label="WhatsApp orders (7 days)" value={leads.count ?? 0} />
      </dl>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Get your store ready</h2>
        <ul className="mt-3 space-y-2">
          {todo.map((t) => (
            <li key={t.text}>
              <Link href={t.href} className="flex min-h-11 items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    t.done ? "bg-brand text-white" : "border border-gray-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className={t.done ? "text-gray-400 line-through" : ""}>{t.text}</span>
                <span className="sr-only">{t.done ? "(done)" : "(to do)"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 space-y-1 text-xs text-gray-400">
        {email && <p>Logged in as {email}</p>}
        <form action={signOutEverywhere}>
          <button className="underline hover:text-ink">Log out of all devices</button>
        </form>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold">{value}</dd>
    </div>
  );
}
