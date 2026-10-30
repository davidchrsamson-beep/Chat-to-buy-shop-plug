import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import ProductTile from "@/components/store/ProductTile";
import StoreHeader from "@/components/store/StoreHeader";
import StoreHero from "@/components/store/StoreHero";
import StaggeredGrid from "@/components/ui/StaggeredGrid";
import { deliveryLabel } from "@/lib/areas";
import { hoursLabel } from "@/lib/hours";
import { isChristmasEdition } from "@/lib/season";
import { loadStore, TILE_FIELDS, toTile, type ProductRow } from "@/lib/storefront";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; type?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await loadStore(slug);
  if (!store) return { title: "Store not found — Ndu" };
  return {
    title: `${store.vendor.business_name} — on Ndu`,
    description: store.vendor.tagline ?? `Shop ${store.vendor.business_name} in Calabar. Order on WhatsApp.`,
  };
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from, type } = await searchParams;
  const store = await loadStore(slug);
  if (!store) notFound();
  const { supabase, vendor } = store;

  const { data, error } = await supabase
    .from("products")
    .select(TILE_FIELDS)
    .eq("vendor_id", vendor.id)
    .eq("status", "live") // also hides drafts when the owner views their own store
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const all = ((data ?? []) as unknown as ProductRow[]).map(toTile);

  // Product types this store actually has, for the filter chips.
  const typeIds = [...new Set(all.map((p) => p.subcategory_id).filter((id): id is number => id !== null))];
  const { data: types } = typeIds.length
    ? await supabase.from("subcategories").select("id, name").in("id", typeIds).order("sort_order")
    : { data: [] as { id: number; name: string }[] };

  const activeType = type && /^\d+$/.test(type) ? Number(type) : null;
  const products = activeType ? all.filter((p) => p.subcategory_id === activeType) : all;
  const hero = vendor.hero_urls[0] ?? all.find((p) => p.cover)?.cover ?? null;
  const christmas = isChristmasEdition();

  // The moving bar at the top: the vendor's announcement and moving line together.
  const topLine =
    [vendor.special_offer, vendor.ticker_text].filter(Boolean).join("   ✦   ") ||
    (christmas ? "Christmas Edition · Order early for the holidays" : null);
  const hours = hoursLabel(vendor);
  const delivery = deliveryLabel(vendor);

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

      <StoreHero
        name={vendor.business_name}
        tagline={vendor.tagline}
        neighbourhood={vendor.neighbourhood}
        verified={vendor.verified}
        photo={hero}
        announcement={topLine}
        christmas={christmas}
      />

      <main id="collection" className="mx-auto max-w-5xl px-5 py-8">
        <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-400">Collection</h2>

        {(types ?? []).length > 1 && (
          <nav aria-label="Product types" className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <TypeChip href={`/s/${vendor.slug}#collection`} active={!activeType}>All</TypeChip>
            {(types ?? []).map((t) => (
              <TypeChip key={t.id} href={`/s/${vendor.slug}?type=${t.id}#collection`} active={activeType === t.id}>
                {t.name}
              </TypeChip>
            ))}
          </nav>
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            Products didn&apos;t load. Please refresh the page.
          </p>
        )}
        {!error && products.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-500">New products are on the way. Tap Chat to ask what&apos;s available.</p>
        )}

        <div className="mt-6">
          {/* The vendor's moving line also travels through the dip in the first row of the gallery. */}
          <StaggeredGrid
            startUneven
            line={vendor.ticker_text ? `${vendor.ticker_text} ✦` : null}
            items={products.map((p) => (
              <ProductTile key={p.id} slug={vendor.slug} product={p} />
            ))}
          />
        </div>

        {(vendor.story || vendor.neighbourhood || vendor.instagram || vendor.tiktok || hours || delivery || vendor.standout) && (
          <section className="mt-14 grid gap-4 sm:grid-cols-2">
            {vendor.story && (
              <div className="rounded-2xl bg-gray-50 p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">About</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">{vendor.story}</p>
              </div>
            )}
            <div className="rounded-2xl bg-gray-50 p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Details</h2>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {vendor.standout && <li className="font-medium text-ink">✦ {vendor.standout}</li>}
                {vendor.neighbourhood && <li>📍 {vendor.neighbourhood}, Calabar</li>}
                {hours && <li>🕒 {hours}</li>}
                {delivery && (
                  <li>
                    🛵 {delivery}
                    {vendor.delivery_note && <span className="block text-gray-500">{vendor.delivery_note}</span>}
                  </li>
                )}
                {vendor.instagram && (
                  <li>
                    <a href={`https://instagram.com/${vendor.instagram}`} target="_blank" rel="noopener noreferrer" className="text-brand">
                      Instagram @{vendor.instagram}
                    </a>
                  </li>
                )}
                {vendor.tiktok && (
                  <li>
                    <a href={`https://www.tiktok.com/@${vendor.tiktok}`} target="_blank" rel="noopener noreferrer" className="text-brand">
                      TikTok @{vendor.tiktok}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-gray-100 px-5 py-8 text-center text-xs text-gray-400">
        © {vendor.business_name} · Powered by{" "}
        {/* Leads only to "open your own store", never to the main market (we don't take vendors' customers). */}
        <Link href="/vendor/signup" className="font-semibold text-gray-500 hover:text-brand">Ndu</Link>
      </footer>
    </div>
  );
}

function TypeChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm ${
        active ? "bg-ink font-semibold text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </Link>
  );
}
