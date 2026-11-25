"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { HomepageDelivery, HomepageStore } from "@/lib/homepage";

const mediaUrl = (url: string) => url.startsWith("/delivered/") ? `/find-a-plug${url}` : url;

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
      const step = card ? card.offsetWidth + 12 : 240;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - step / 2;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [stores.length]);

  return (
    <div className="mt-8 space-y-9">
      <section aria-labelledby="popular-stores-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="popular-stores-title" className="text-base font-bold tracking-tight">Discover popular stores around you</h2>
          <Link href="/marketplace" className="shrink-0 text-xs font-semibold text-accent">See all →</Link>
        </div>
        {stores.length ? (
          <div ref={storeTrack} className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {stores.map((store) => {
              const photo = store.hero_urls?.[0] || store.logo_url;
              return (
                <button key={store.id} data-store-card type="button" onClick={() => onAsk(`Show me products from ${store.business_name}`)}
                  className="w-[82%] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-panel text-left shadow-sm sm:w-[270px]">
                  <div className="relative h-36 bg-[#F1F1F1]">
                    {photo ? <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" /> :
                      <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-400">{store.business_name.slice(0,1).toUpperCase()}</div>}
                    {store.verified && <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-emerald-700">✓ Verified</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{store.business_name}</span>
                      <span className="mt-0.5 block truncate text-xs text-mute">{store.neighbourhood || "Shop Plug vendor"}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-accent">Explore →</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : <p className="rounded-2xl bg-panel p-4 text-sm text-mute">Local stores will appear here as they join Shop Plug.</p>}
      </section>

      <section aria-labelledby="recent-orders-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-orders-title" className="text-base font-bold tracking-tight">Recently ordered on Shop Plug</h2>
          <span className="text-[11px] text-mute">Swipe to explore</span>
        </div>
        {deliveries.length ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {deliveries.map((item) => (
              <button key={item.id} type="button" onClick={() => onAsk(item.ask || `${item.item} delivered to ${item.area}`)}
                className="w-[46%] min-w-[150px] max-w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-panel text-left">
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  {item.video_url ? <video src={mediaUrl(item.video_url)} poster={mediaUrl(item.image_url)} muted loop autoPlay playsInline className="h-full w-full object-cover" /> :
                    <img src={mediaUrl(item.image_url)} alt={item.item} loading="lazy" className="h-full w-full object-cover" />}
                  {item.video_url && <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">▶ Video</span>}
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-semibold text-mute">{item.when_text || "Recently"}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold">{item.item}</p>
                  <p className="mt-1 truncate text-xs text-mute">{item.area}</p>
                </div>
              </button>
            ))}
          </div>
        ) : <p className="rounded-2xl bg-panel p-4 text-sm text-mute">Recent customer orders will appear here.</p>}
      </section>

      <section aria-labelledby="endorsed-title" className="border-y border-line py-6">
        <h2 id="endorsed-title" className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-mute">Endorsed by</h2>
        <div className="grid grid-cols-3 items-center gap-4 sm:gap-8">
          <div className="flex h-24 items-center justify-center sm:h-28">
            <img src="/endorsements/finesse-hair.jpg" alt="Finesse Hair — Affordable Luxury" loading="lazy" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex h-24 items-center justify-center sm:h-28">
            <img src="/endorsements/josie-cement.jpg" alt="Josie Cement" loading="lazy" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex h-24 items-center justify-center sm:h-28">
            <img src="/endorsements/gentleman-photography.jpg" alt="Gentleman Photography" loading="lazy" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-2xl bg-[#FFF4EA] px-4 py-4 text-[#242424]">
        <span aria-hidden="true" className="text-2xl text-accent">⌖</span>
        <p className="flex-1 text-sm font-semibold leading-snug">Support local businesses in your community.</p>
        <Link href="/marketplace" className="shrink-0 rounded-full bg-[#1C2434] px-3 py-2 text-[11px] font-semibold text-white">Start shopping →</Link>
      </div>
    </div>
  );
}
