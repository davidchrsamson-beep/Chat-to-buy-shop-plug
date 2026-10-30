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
        <CategoryNav active="all" />

        <MarketSection
          title="Top Choices"
          startUneven={true}
          line="Christmas Edition · Calabar's finest, all in one place ✦"
          items={topChoices.map((p) => <ProductCard key={p.id} product={p} />)}
        />

        <LiveNote>✨ New store just joined Ndu 10 hours ago — check them out</LiveNote>

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
