import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BuyActions from "@/components/store/BuyActions";
import ProductGallery from "@/components/store/ProductGallery";
import ProductTile from "@/components/store/ProductTile";
import StoreHeader from "@/components/store/StoreHeader";
import { attributeLabel } from "@/lib/attributes";
import { formatDay, formatPrice } from "@/lib/price";
import { loadStore, TILE_FIELDS, toTile, type ProductRow } from "@/lib/storefront";

type Props = {
  params: Promise<{ slug: string; productId: string }>;
  searchParams: Promise<{ from?: string }>;
};

async function loadProduct(slug: string, productId: string) {
  if (!/^[0-9a-f-]{36}$/.test(productId)) return null;
  const store = await loadStore(slug);
  if (!store) return null;
  const { data } = await store.supabase
    .from("products")
    .select(
      "id, name, description, price_type, price_kobo, price_max_kobo, negotiable, in_stock, attributes, price_confirmed_at, product_media(url, sort_order)",
    )
    .eq("id", productId)
    .eq("vendor_id", store.vendor.id)
    .eq("status", "live")
    .is("deleted_at", null)
    .maybeSingle();
  return data ? { ...store, product: data } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productId } = await params;
  const found = await loadProduct(slug, productId);
  if (!found) return { title: "Product not found — Shop Plug" };
  return {
    title: `${found.product.name} — ${found.vendor.business_name}`,
    description: `${formatPrice(found.product)} · ${found.vendor.business_name} on Shop Plug`,
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug, productId } = await params;
  const { from } = await searchParams;
  const found = await loadProduct(slug, productId);
  if (!found) notFound();
  const { supabase, vendor, product } = found;

  const photos = [...((product.product_media ?? []) as { url: string; sort_order: number }[])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const details = Object.entries((product.attributes ?? {}) as Record<string, string>).filter(([, v]) => v);
  const priceLabel = formatPrice(product);

  // "More from this store": up to 5 other products, shown as small boxes below.
  const { data: others } = await supabase
    .from("products")
    .select(TILE_FIELDS)
    .eq("vendor_id", vendor.id)
    .eq("status", "live")
    .is("deleted_at", null)
    .neq("id", product.id)
    .order("created_at", { ascending: false })
    .limit(5);
  const more = ((others ?? []) as unknown as ProductRow[]).map(toTile);

  return (
    <div className="min-h-screen bg-white">
      <StoreHeader
        vendorId={vendor.id}
        slug={vendor.slug}
        name={vendor.business_name}
        logoUrl={vendor.logo_url}
        whatsapp={vendor.whatsapp}
        from={from ?? null}
      />

      <main className="mx-auto max-w-5xl pb-12 sm:px-5 sm:pt-6">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
          {/* Every angle the vendor uploaded. On wide screens it stays in view while the details scroll. */}
          <div className="sm:sticky sm:top-20">
            <ProductGallery photos={photos.map((ph) => ph.url)} name={product.name} />
          </div>

          <div className="px-5 sm:px-0">
            <Link href={`/s/${vendor.slug}`} className="text-sm text-gray-500 hover:text-ink">
              ‹ {vendor.business_name}
            </Link>
            <h1 className="mt-2 text-2xl font-bold">{product.name}</h1>
            <p className="mt-2 text-2xl font-bold">{priceLabel}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium">
              {product.negotiable && <span className="rounded-full bg-brand-tint px-2.5 py-1 text-brand-dark">Negotiable</span>}
              <span className={`rounded-full px-2.5 py-1 ${product.in_stock ? "bg-gray-100 text-gray-700" : "bg-amber-50 text-amber-800"}`}>
                {product.in_stock ? "In stock" : "Out of stock"}
              </span>
              {vendor.verified && <span className="rounded-full bg-brand-tint px-2.5 py-1 text-brand-dark">✓ Verified store</span>}
            </div>
            <p className="mt-2 text-xs text-gray-400">Price confirmed {formatDay(product.price_confirmed_at)}</p>

            {details.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-4 text-sm">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-gray-500">{attributeLabel(k)}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-gray-700">{product.description}</p>
            )}

            <div className="mt-6">
              <BuyActions
                vendorId={vendor.id}
                slug={vendor.slug}
                vendorName={vendor.business_name}
                whatsapp={vendor.whatsapp}
                productId={product.id}
                productName={product.name}
                priceLabel={priceLabel}
                priceKobo={product.price_kobo}
                negotiable={product.negotiable}
                inStock={product.in_stock}
                teamWhatsapp={process.env.NEXT_PUBLIC_TEAM_WHATSAPP ?? ""}
              />
            </div>
          </div>
        </div>

        {more.length > 0 && (
          <section className="mt-12 px-5 sm:px-0">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              More from {vendor.business_name}
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {more.map((p) => (
                <ProductTile key={p.id} slug={vendor.slug} product={p} small />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
