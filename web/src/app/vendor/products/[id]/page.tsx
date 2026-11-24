import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardShell from "@/components/vendor/DashboardShell";
import ProductForm, { type ProductInitial } from "@/components/vendor/ProductForm";
import type { PriceType } from "@/lib/price";
import { loadCategoryOptions, loadMinSearchPhotos, requireVendor } from "@/lib/vendor";
import { deleteProduct } from "../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { supabase, vendor } = await requireVendor();
  if (!vendor) return null;

  const [{ data: product }, categories, minPhotos] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, description, subcategory_id, price_type, price_kobo, price_max_kobo, negotiable, in_stock, attributes, status, product_media(url, sort_order)",
      )
      .eq("id", id)
      .eq("vendor_id", vendor.id)
      .is("deleted_at", null)
      .maybeSingle(),
    loadCategoryOptions(supabase, vendor.id),
    loadMinSearchPhotos(supabase),
  ]);
  if (!product) notFound();

  const media = (product.product_media ?? []) as { url: string; sort_order: number }[];
  const naira = (kobo: number | null) => (kobo ? String(Math.round(kobo / 100)) : "");

  const initial: ProductInitial = {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    subcategoryId: product.subcategory_id,
    priceType: product.price_type as PriceType,
    priceNaira: naira(product.price_kobo),
    priceMaxNaira: naira(product.price_max_kobo),
    negotiable: product.negotiable,
    inStock: product.in_stock,
    attributes: (product.attributes ?? {}) as Record<string, string>,
    photos: [...media].sort((a, b) => a.sort_order - b.sort_order).map((m) => m.url),
    status: product.status,
  };

  return (
    <DashboardShell active="products" storeName={vendor.business_name}>
      <Link href="/vendor/products" className="text-sm text-gray-500 hover:text-ink">‹ Products</Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold">Edit product</h1>
      <ProductForm categories={categories} minSearchPhotos={minPhotos} initial={initial} />

      <form action={deleteProduct} className="border-t border-gray-200 pt-6 pb-10">
        <input type="hidden" name="id" value={product.id} />
        <button className="min-h-11 text-sm font-medium text-red-600 hover:underline">Delete this product</button>
        <p className="text-xs text-gray-400">It disappears from your store and search. Shop Plug support can restore it if needed.</p>
      </form>
    </DashboardShell>
  );
}
