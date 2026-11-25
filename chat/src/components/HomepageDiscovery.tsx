"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { HomepageDelivery, HomepageStore } from "@/lib/homepage";

const mediaUrl = (url: string) => url.startsWith("/delivered/") ? "/find-a-plug" + url : url;

function StorefrontIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}

export function HomepageDiscovery({
  stores,
  deliveries,
  onAsk,
}: {
  stores: HomepageStore[];
  deliveries: HomepageDelivery[];
  onAsk: (text: string) => void;
}) {
  const storeTrack = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = storeTrack.current;
    if (!el || stores.length < 2) return;
    const timer = window.setInterval(() => {
      const card = el.querySelector<HTMLElement>("[data-store-card]");
      const step = card ? card.offsetWidth + 12 : 300;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - step / 2;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [stores.length]);

  return (
    <div className="mt-7 space-y-8">
      <section aria-labelledby="popular-stores-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="popular-stores-title" className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-[#20202A]">
            <span className="text-[#FF7A1A]"><StorefrontIcon /></span>
            Discover popular stores around you
          </h2>
          <Link href="/marketplace" className="shrink-0 text-xs font-bold text-[#F36C13]">See all <span aria-hidden="true">→</span></Link>
        </div>
        {stores.length ? (
          <div ref={storeTrack} className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {stores.map((store) => {
              const photos = (store.hero_urls || []).filter(Boolean);
              const storefront = photos[0] || store.logo_url;
              const inside = photos[1];
              const productOne = photos[2];
              const productTwo = photos[3];
              return (
                <button key={store.id} data-store-card type="button"
                  onClick={() => onAsk("Show me products from " + store.business_name)}
                  className="group w-[88%] max-w-[370px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-[#F0E6DE] bg-white text-left shadow-[0_5px_18px_rgba(80,45,20,0.07)] transition duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-[.99] sm:w-[350px]">
                  <div className="flex min-h-[126px] gap-3 p-2.5">
                    <div className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-[14px] bg-[#FFF0E4]">
                      {storefront ? <img src={storefront} alt={store.business_name + " storefront"} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> :
                        <div className="flex h-full items-center justify-center text-4xl font-black text-[#F4A36C]">{store.business_name.slice(0,1).toUpperCase()}</div>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[13px] font-extrabold text-[#20202A]">{store.business_name}</p>
                          {store.verified && <span aria-label="Verified vendor" className="shrink-0 text-[12px] text-[#F36C13]">✦</span>}
                        </div>
                        <p className="mt-1 truncate text-[11px] text-[#77747A]">{store.neighbourhood || "Local store"}</p>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex gap-1.5">
                          {[inside, productOne, productTwo].filter(Boolean).slice(0,3).map((src, index) => (
                            <span key={src} className={"h-8 w-8 overflow-hidden rounded-lg border border-[#F0E6DE] bg-[#FFF8F2] " + (index === 0 ? "hidden" : "")}>
                              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                            </span>
                          ))}
                          {!inside && !productOne && !productTwo && <span className="text-[10px] text-[#8B8580]">Explore this store</span>}
                        </div>
                        <span className="shrink-0 rounded-full bg-[#FFF0E4] px-2.5 py-1.5 text-[10px] font-bold text-[#E96512] transition group-hover:bg-[#FF7A1A] group-hover:text-white">Explore →</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : <p className="rounded-2xl border border-dashed border-[#EAD9CB] bg-white/70 p-4 text-sm text-[#77747A]">Local stores will appear here as they join Shop Plug.</p>}
        <p className="mt-1 text-[10px] text-[#8A817B]">Swipe to explore nearby businesses</p>
      </section>

      <section aria-labelledby="recent-orders-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-orders-title" className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-[#20202A]">
            <span className="text-[#FF7A1A]"><ClockIcon /></span>
            Recently ordered on Shop Plug
          </h2>
          <span className="shrink-0 text-[10px] font-semibold text-[#F36C13]">Swipe to explore →</span>
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

      <section aria-labelledby="endorsed-title" className="rounded-[20px] border border-[#F2E4D9] bg-white/80 px-4 py-5">
        <h2 id="endorsed-title" className="mb-4 text-center text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#82766E]">Endorsed by</h2>
        <div className="grid grid-cols-3 items-center gap-4 sm:gap-8">
          <div className="flex h-16 items-center justify-center sm:h-20"><img src="/endorsements/finesse-hair.jpg" alt="Finesse Hair — Affordable Luxury" loading="lazy" className="max-h-full max-w-full object-contain" /></div>
          <div className="flex h-16 items-center justify-center sm:h-20"><img src="/endorsements/josie-cement.jpg" alt="Josie Cement" loading="lazy" className="max-h-full max-w-full object-contain" /></div>
          <div className="flex h-16 items-center justify-center sm:h-20"><img src="/endorsements/gentleman-photography.jpg" alt="Gentleman Photography" loading="lazy" className="max-h-full max-w-full object-contain" /></div>
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-[20px] bg-[#FFF0E4] px-4 py-4 text-[#28232A]">
        <span aria-hidden="true" className="text-2xl text-[#F36C13]">⌖</span>
        <p className="flex-1 text-sm font-extrabold leading-snug">Support local businesses in your community.</p>
        <Link href="/marketplace" className="shrink-0 rounded-full bg-[#20202A] px-3 py-2.5 text-[10px] font-bold text-white">Start shopping →</Link>
      </div>
    </div>
  );
}
