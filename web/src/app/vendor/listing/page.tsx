import DashboardShell from "@/components/vendor/DashboardShell";
import { formatNaira } from "@/lib/format";
import { describeListing, getListingStatus } from "@/lib/listing";
import { requireVendor } from "@/lib/vendor";

const TONE = {
  good: "border-brand/30 bg-brand-tint text-brand-dark",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-800",
};

export default async function ListingPage() {
  const { supabase, vendor } = await requireVendor();
  if (!vendor) return null;

  const listing = await getListingStatus(supabase, vendor.id);
  const status = describeListing(listing);
  const monthly = listing.plans.find((p) => p.months === 1)?.priceKobo ?? null;

  return (
    <DashboardShell active="listing" storeName={vendor.business_name}>
      <h1 className="text-2xl font-bold">Listing</h1>
      <p className="mt-1 text-sm text-gray-500">
        Your storefront is free, always. Listing puts your products in Find a Plug search and on the Shop Plug marketplace, where new buyers find you.
      </p>

      <div className={`mt-4 rounded-2xl border p-4 ${TONE[status.tone]}`}>
        <p className="font-semibold">{status.title}</p>
        <p className="mt-1 text-sm">{status.body}</p>
      </div>

      <h2 className="mt-8 font-semibold">Plans</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-3">
        {listing.plans.map((p) => {
          const saving = monthly ? monthly * p.months - p.priceKobo : 0;
          return (
            <li key={p.months} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">{p.months === 1 ? "1 month" : `${p.months} months`}</p>
              <p className="mt-1 text-2xl font-bold">{formatNaira(p.priceKobo)}</p>
              {saving > 0 && <p className="mt-1 text-xs font-semibold text-brand-dark">Save {formatNaira(saving)}</p>}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-gray-600 shadow-sm">
        Online payment opens before 30 November. Until then, every store is listed free.
      </p>
    </DashboardShell>
  );
}
