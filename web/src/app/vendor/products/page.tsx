import Link from "next/link";
import type { ReactNode } from "react";
import DashboardShell from "@/components/vendor/DashboardShell";
import { formatPrice } from "@/lib/price";
import { loadMinSearchPhotos, requireVendor } from "@/lib/vendor";

type Row = {
  id: string;
  name: string;
  status: string;
  in_stock: boolean;
  negotiable: boolean;
  price_type: string;
  price_kobo: number | null;
  price_max_kobo: number | null;
  product_media: { url: string; sort_order: number }[];
};

export default async function ProductsPage() {
  const { supabase, vendor } = await requireVendor();
  if (!vendor) return null;

  const [{ data, error }, minPhotos] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, status, in_stock, negotiable, price_type, price_kobo, price_max_kobo, product_media(url, sort_order)")
      .eq("vendor_id", vendor.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    loadMinSearchPhotos(supabase),
  ]);
  const products = (data ?? []) as unknown as Row[];

  return (
    <DashboardShell active="products" storeName={vendor.business_name}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Link href="/vendor/products/ai" className="flex min-h-11 items-center rounded-xl bg-ink px-4 font-semibold text-white hover:bg-gray-800">
            ✨ Add with AI
          </Link>
          <Link href="/vendor/products/new" className="flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-4 font-semibold hover:border-brand">
            + Add one
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Your products didn&apos;t load. Please refresh the page.
        </p>
      )}

      {!error && products.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-gray-500">Add your first product. Snap it from {minPhotos} angles and you&apos;re done.</p>
          <Link href="/vendor/products/new" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white">
            Add your first product
          </Link>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {products.map((p) => {
          const photos = [...p.product_media].sort((a, b) => a.sort_order - b.sort_order);
          const needed = Math.max(0, minPhotos - photos.length);
          return (
            <li key={p.id}>
              <Link href={`/vendor/products/${p.id}`} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm hover:ring-2 hover:ring-brand/20">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="text-sm">{formatPrice(p)}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-medium">
                    <Badge tone={p.status === "live" ? "good" : "quiet"}>{p.status === "live" ? "Live" : "Draft"}</Badge>
                    {!p.in_stock && <Badge tone="warn">Out of stock</Badge>}
                    {p.negotiable && <Badge tone="quiet">Negotiable</Badge>}
                    {p.status === "live" && needed > 0 && (
                      <Badge tone="warn">Add {needed} more {needed === 1 ? "photo" : "photos"} to appear in search</Badge>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </DashboardShell>
  );
}

function Badge({ tone, children }: { tone: "good" | "warn" | "quiet"; children: ReactNode }) {
  const styles = {
    good: "bg-brand-tint text-brand-dark",
    warn: "bg-amber-50 text-amber-800",
    quiet: "bg-gray-100 text-gray-600",
  };
  return <span className={`rounded-full px-2 py-0.5 ${styles[tone]}`}>{children}</span>;
}
