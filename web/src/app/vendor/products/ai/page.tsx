import Link from "next/link";
import AiBulkUploader from "@/components/vendor/AiBulkUploader";
import DashboardShell from "@/components/vendor/DashboardShell";
import { getListingStatus } from "@/lib/listing";
import { loadCategoryOptions, loadMinSearchPhotos, requireVendor } from "@/lib/vendor";

export default async function AiAddPage() {
  const { supabase, vendor } = await requireVendor();
  if (!vendor) return null;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [listing, categories, minPhotos, { data: capRow }, { data: used }] = await Promise.all([
    getListingStatus(supabase, vendor.id),
    loadCategoryOptions(supabase, vendor.id),
    loadMinSearchPhotos(supabase),
    supabase.from("settings").select("value").eq("key", "ai_monthly_photo_cap").maybeSingle(),
    supabase.from("ai_usage").select("photos").eq("vendor_id", vendor.id).gte("created_at", monthStart.toISOString()),
  ]);
  const cap = Number(capRow?.value) || 300;
  const photosLeft = Math.max(0, cap - (used ?? []).reduce((s, r) => s + (Number(r.photos) || 0), 0));

  return (
    <DashboardShell active="products" storeName={vendor.business_name}>
      <Link href="/vendor/products" className="text-sm text-gray-500 hover:text-ink">‹ Products</Link>
      <h1 className="mt-2 text-2xl font-bold">✨ Add products with AI</h1>
      <p className="mb-4 mt-1 text-sm text-gray-500">
        Drop in your photos. The AI groups the angles of each item and writes the name, type, details and description. You
        just check them and add the prices.
      </p>

      {listing.listed ? (
        <AiBulkUploader categories={categories} minSearchPhotos={minPhotos} photosLeft={photosLeft} />
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">The AI assistant comes with a listing plan</p>
          <p className="mt-1">Subscribe to appear in errand search and the Ndu market, and the AI assistant is included.</p>
          <Link href="/vendor/listing" className="mt-3 inline-block font-semibold underline">See plans</Link>
        </div>
      )}
    </DashboardShell>
  );
}
