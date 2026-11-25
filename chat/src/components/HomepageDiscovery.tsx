"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { HomepageDelivery, HomepageStore } from "@/lib/homepage";

const mediaUrl = (url: string) => url.startsWith("/delivered/") ? "/find-a-plug" + url : url;
const EIGHT_MILES_ASSETS = {
  storefront: "/store_assets/eight-miles-exterior.jpg",
  food: "/store_assets/eight-miles-food.jpg",
  provisions: "/store_assets/eight-miles-groceries.jpg",
  softDrinks: "/store_assets/eight-miles-drinks.jpg",
};

const isEightMilesStore = (store: HomepageStore) => /(?:eight|8)[\s-]*miles?/i.test(store.business_name);

// Temporary featured example while Eight Miles is not yet onboarded as a live vendor.
const EIGHT_MILES_PLACEHOLDER: HomepageStore = {
  id: "featured-eight-miles-placeholder",
  business_name: "Eight Miles Supermarket & Food Plaza",
  slug: "eight-miles-supermarket-food-plaza",
  neighbourhood: "Marian",
  logo_url: null,
  hero_urls: [],
  verified: false,
};

function StorefrontIcon() {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}
function PinIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
}

export function HomepageDiscovery({ stores, deliveries, onAsk }: {
  stores: HomepageStore[];
  deliveries: HomepageDelivery[];
  onAsk: (text: string) => void;
}) {
  const storeTrack = useRef<HTMLDivElement>(null);
  const featuredStores = [
    stores.find(isEightMilesStore) ?? EIGHT_MILES_PLACEHOLDER,
    ...stores.filter((store) => !isEightMilesStore(store)),
  ];

  useEffect(() => {
    const el = storeTrack.current;
    if (!el || featuredStores.length < 2) return;
    const timer = window.setInterval(() => {
      const card = el.querySelector<HTMLElement>("[data-store-card]");
      const step = card ? card.offsetWidth + 12 : el.clientWidth;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 24;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [featuredStores.length]);

  return (
    <div className="mt-5 space-y-7 sm:mt-7 sm:space-y-9">
      <section aria-labelledby="popular-stores-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="popular-stores-title" className="flex min-w-0 items-center gap-2 text-[15px] font-extrabold tracking-tight text-[#20202A] sm:text-base">
            <span className="shrink-0 text-[#F36C13]"><StorefrontIcon /></span>
            <span>Discover popular stores around you</span>
          </h2>
          <Link href="/marketplace" className="shrink-0 text-xs font-bold text-[#E96512]">See all <span aria-hidden="true">→</span></Link>
        </div>
        <div ref={storeTrack} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {featuredStores.map((store) => {
              const photos = (store.hero_urls || []).filter(Boolean);
              const isEightMiles = isEightMilesStore(store);
              const storefront = isEightMiles ? EIGHT_MILES_ASSETS.storefront : (photos[0] || store.logo_url);
              const gallery = isEightMiles
                ? [EIGHT_MILES_ASSETS.food, EIGHT_MILES_ASSETS.provisions, EIGHT_MILES_ASSETS.softDrinks]
                : [photos[1], photos[2], photos[3]].filter(Boolean).slice(0, 3);
              const description = isEightMiles
                ? "Food · Provisions · Soft drinks"
                : "Explore this store’s products and categories";
              const browsePrompt = isEightMiles
                ? "Show me food, provisions and soft drinks from Eight Miles Supermarket"
                : "Show me more products from " + store.business_name;
              return (
                <article key={store.id} data-store-card className="w-full min-w-full shrink-0 snap-start overflow-hidden rounded-[22px] border border-[#F0DCCB] bg-[#FFFCF9] p-3 shadow-[0_8px_24px_rgba(103,61,31,0.09)] sm:p-4">
                  <div className="grid grid-cols-[40%_1fr] gap-3 sm:grid-cols-[38%_1fr] sm:gap-4">
                    <div className="relative min-h-[166px] overflow-hidden rounded-[16px] bg-[#F8E8DA] sm:min-h-[190px]">
                      {storefront ? <img src={storefront} alt={store.business_name + " storefront"} loading={isEightMiles ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover"/> :
                        <div className="flex h-full min-h-[166px] items-center justify-center text-5xl font-black text-[#E9A878]">{store.business_name.slice(0,1).toUpperCase()}</div>}
                    </div>
                    <div className="flex min-w-0 flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-start gap-1.5">
                          <p className="min-w-0 text-[15px] font-extrabold leading-tight text-[#24212A] sm:text-lg">{store.business_name}</p>
                          {store.verified && <span title="Verified store" aria-label="Verified store" className="mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-[#E8F5EC] text-[11px] font-black text-[#21864A]">✓</span>}
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                          {gallery.map((src, index) => (
                            <div key={src} className="relative aspect-square min-w-0 overflow-hidden rounded-[10px] bg-[#F7E9DF]">
                              <img src={src} alt={store.business_name + " featured item " + (index + 1)} loading="lazy" className="h-full w-full object-cover"/>
                            </div>
                          ))}
                          <button type="button" onClick={() => onAsk(browsePrompt)} className="flex aspect-square w-full min-w-0 flex-col items-center justify-center gap-0 rounded-[10px] bg-[#FFF0E4] p-1 text-center text-[#D95E10] transition hover:bg-[#FCE1CF]">
                            <span className="text-[8px] font-extrabold leading-tight sm:text-[9px]">See more</span>
                            <span className="text-[10px] leading-none" aria-hidden="true">→</span>
                          </button>
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#766A62] sm:text-xs"><span className="text-[#E96512]"><PinIcon /></span>{store.neighbourhood || "Your neighbourhood"}</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[#71665F] sm:text-xs">{description}</p>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => onAsk("I want to chat with " + store.business_name)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-black px-4 py-2.5 text-[11px] font-bold text-white transition hover:bg-[#111111] sm:w-auto sm:min-w-[150px]">
                    Chat with vendor <span className="ml-2" aria-hidden="true">↗</span>
                  </button>
                </article>
              );
            })}
        </div>
        <p className="mt-1 text-[10px] text-[#8A817B]">Swipe to explore stores in your community</p>
      </section>

      <section aria-labelledby="recent-orders-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-orders-title" className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-[#20202A] sm:text-base">
            <span className="text-[#F36C13]"><ClockIcon /></span>
            Recently ordered on Shop Plug
          </h2>
          <span className="shrink-0 text-[10px] font-semibold text-[#E96512]">Swipe to explore →</span>
        </div>
        {deliveries.length ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {deliveries.map((item) => (
              <button key={item.id} type="button" onClick={() => onAsk(item.ask || (item.item + " delivered to " + item.area))}
                className="w-[45%] min-w-[148px] max-w-[190px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-[#F0E6DE] bg-white text-left shadow-[0_4px_14px_rgba(80,45,20,0.06)] transition active:scale-[.98]">
                <div className="relative aspect-[4/4.3] overflow-hidden bg-[#FFF0E4]">
                  {item.video_url ? <video src={mediaUrl(item.video_url)} poster={mediaUrl(item.image_url)} muted loop autoPlay playsInline className="h-full w-full object-cover" /> :
                    <img src={mediaUrl(item.image_url)} alt={item.item} loading="lazy" className="h-full w-full object-cover" />}
                  {item.video_url && <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">▶ Video</span>}
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-semibold text-[#9A8E85]">{item.when_text || "Recently"}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] font-extrabold text-[#28232A]">{item.item}</p>
                  <p className="mt-1 truncate text-[11px] text-[#77747A]">{item.area}</p>
                </div>
              </button>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-white p-4 text-sm text-[#77747A]">Recent customer orders will appear here.</p>}
      </section>

      <section aria-labelledby="endorsed-title" className="px-1 py-3">
        <h2 id="endorsed-title" className="mb-4 text-center text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#82766E]">Endorsed by</h2>
        <div className="grid grid-cols-3 items-center gap-3 sm:gap-8">
          <div className="flex h-16 min-w-0 items-center justify-center sm:h-20"><img src="/endorsements/finesse-hair.png" alt="Finesse Hair — Affordable Luxury" loading="eager" className="max-h-12 w-full max-w-[94%] object-contain sm:max-h-14"/></div>
          <div className="flex h-16 min-w-0 items-center justify-center sm:h-20"><img src="/endorsements/josie-cement.jpg" alt="Josie Cement" loading="eager" className="max-h-12 w-full max-w-[94%] scale-[1.8] object-contain sm:max-h-14 sm:scale-[2]"/></div>
          <div className="flex h-16 flex-col items-center justify-center gap-0.5 sm:h-20">
            <img src="/endorsements/gentleman-photography.png" alt="Gentleman Photography logo" loading="eager" className="h-10 w-full max-w-[94%] object-contain sm:h-12"/>
            <span className="text-center text-[8px] font-semibold leading-tight text-[#6D5141] sm:text-[10px]">Gentleman Photography</span>
          </div>
        </div>
      </section>

      <div className="rounded-[20px] bg-[#FFF0E4] px-5 py-5 text-center text-[#28232A]">
        <p className="text-base font-extrabold leading-snug sm:text-lg">Support local businesses in your community.</p>
      </div>
    </div>
  );
}
