import Link from "next/link";
import DashboardShell from "@/components/vendor/DashboardShell";
import ProductForm from "@/components/vendor/ProductForm";
import { loadCategoryOptions, loadMinSearchPhotos, requireVendor } from "@/lib/vendor";

export default async function NewProductPage() {
  const { supabase, vendor } = await requireVendor();
  if (!vendor) return null;

  const [categories, minPhotos] = await Promise.all([
    loadCategoryOptions(supabase, vendor.id),
    loadMinSearchPhotos(supabase),
  ]);

  return (
    <DashboardShell active="products" storeName={vendor.business_name}>
      <Link href="/vendor/products" className="text-sm text-gray-500 hover:text-ink">‹ Products</Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold">Add a product</h1>
      <ProductForm categories={categories} minSearchPhotos={minPhotos} />
    </DashboardShell>
  );
}
