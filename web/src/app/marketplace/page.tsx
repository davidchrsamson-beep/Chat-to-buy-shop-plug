import type { Metadata } from "next";
import SiteHeader from "@/components/market/SiteHeader";
import Hero from "@/components/market/Hero";
import CategoryNav from "@/components/market/CategoryNav";
import FestiveSides from "@/components/market/FestiveSides";
import MarketSection from "@/components/market/MarketSection";
import ProductCard from "@/components/market/ProductCard";
import LiveNote from "@/components/market/LiveNote";
import SiteFooter from "@/components/market/SiteFooter";
import Marquee from "@/components/ui/Marquee";
import { sampleProducts } from "@/lib/sample-data";
import { isChristmasEdition } from "@/lib/season";
import { FIND_A_PLUG_URL } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Shop Plug Marketplace",
  robots: { index: false, follow: false },
};

export default function Home() {
  // Sample groupings for now; the next part switches these to real vendors' products.
  const topChoices = sampleProducts.slice(0, 6);
  const bestOfBudget = [...sampleProducts].sort((a, b) => a.priceKobo - b.priceKobo).slice(0, 6);
  const freshDrops = [...sampleProducts].reverse().slice(0, 6);
  const discover = sampleProducts.slice(2, 8);
  const christmas = isChristmasEdition();

  return (
    <>
      <SiteHeader />
      {christmas && (
        <Marquee
          text="Christmas Edition · Gifts from Calabar's finest vendors · Order early for the holidays"
          speed={22}
          className="py-2 text-[11px]"
        />
      )}
      {christmas && <FestiveSides />}

      <main className="relative z-10">
        <Hero />
        <section aria-labelledby="find-a-plug-title" className="mx-auto max-w-5xl px-5 pb-8">
          <div className="flex flex-col gap-4 border-y border-brand/20 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="find-a-plug-title" className="font-serif text-xl font-bold">Find a Plug</h2>
              <p className="mt-1 max-w-xl text-sm text-gray-600">
                Looking for something beyond the marketplace? Tell a local plug what you need and arrange delivery in chat.
              </p>
            </div>
            <a href={FIND_A_PLUG_URL} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">
              Find a Plug <span aria-hidden="true" className="ml-2">→</span>
            </a>
          </div>
        </section>
        <CategoryNav active="all" />

        <MarketSection
          title="Top Choices"
          startUneven={true}
          line="Christmas Edition · Calabar's finest, all in one place ✦"
          items={topChoices.map((p) => <ProductCard key={p.id} product={p} />)}
        />

        <LiveNote>✨ New store just joined Shop Plug 10 hours ago — check them out</LiveNote>

        <MarketSection
          title="Best of Budget"
          startUneven={false}
          items={bestOfBudget.map((p) => <ProductCard key={p.id} product={p} variant="budget" />)}
        />

        {/* Moving lines inside the market's products: one at the top (Top Choices), one lower down. */}
        <MarketSection
          title="Fresh Drops"
          icon="🆕"
          startUneven={true}
          line="Shop fast at the most affordable prices ✦"
          items={freshDrops.map((p) => <ProductCard key={p.id} product={p} />)}
        />

        <LiveNote>🔥 &quot;Satin&quot; is the most ordered item this week</LiveNote>

        <MarketSection
          title="Discover"
          icon="✦"
          startUneven={false}
          items={discover.map((p) => <ProductCard key={p.id} product={p} variant="discover" />)}
        />

        <LiveNote>✨ &quot;Satin&quot; was just added by Kingof combo</LiveNote>
      </main>
      <SiteFooter />
    </>
  );
}
