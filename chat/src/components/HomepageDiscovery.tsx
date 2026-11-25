"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { HomepageDelivery, HomepageStore } from "@/lib/homepage";

const mediaUrl = (url: string) => url.startsWith("/delivered/") ? "/find-a-plug" + url : url;

function StorefrontIcon() {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v10h14V10M9 20v-6h6v6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg>;
}
function ClockIcon() {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
}
function PinIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
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
      const step = card ? card.offsetWidth + 12 : el.clientWidth;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 24;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [stores.length]);

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
        {stores.length ? (
          <div ref={storeTrack} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
            {stores.map((store) => {
              const photos = (store.hero_urls || []).filter(Boolean);
              const storefront = photos[0] || store.logo_url;
              const inside = photos[1];
              const productOne = photos[2];
              const productTwo = photos[3];
              const gallery = [inside, productOne, productTwo].filter(Boolean);
              return (
                <button key={store.id} data-store-card type="button"
                  onClick={() => onAsk("Show me products from " + store.business_name)}
                  className="group w-full min-w-full shrink-0 snap-start overflow-hidden rounded-[22px] border border-[#F0DCCB] bg-[#FFFCF9] text-left shadow-[0_8px_24px_rgba(103,61,31,0.09)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(103,61,31,0.14)] active:scale-[.995]">
                  <div className="grid grid-cols-[42%_1fr] gap-3 p-3 sm:grid-cols-[40%_1fr] sm:gap-4 sm:p-4">
                    <div className="relative min-h-[142px] overflow-hidden rounded-[16px] bg-[#F8E8DA] sm:min-h-[190px]">
                      {storefront ? <img src={storefront} alt={store.business_name + " storefront"} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" /> :
                        <div className="flex h-full min-h-[142px] items-center justify-center text-5xl font-black text-[#E9A878]">{store.business_name.slice(0,1).toUpperCase()}</div>}
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-1 text-[9px] font-semibold text-white">Storefront</span>
                    </div>
                    <div className="flex min-w-0 flex-col justify-between py-1">
                      <div>
                        <div className="flex items-start gap-1.5">
                          <p className="min-w-0 text-[15px] font-extrabold leading-tight text-[#24212A] sm:text-lg">{store.business_name}</p>
                          {store.verified && <span title="Verified store" aria-label="Verified store" className="mt-0.5 flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-[#E8F5EC] text-[11px] font-black text-[#21864A]">✓</span>}
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#766A62] sm:text-xs"><span className="text-[#E96512]"><PinIcon /></span>{store.neighbourhood || "Local neighbourhood"}</p>
                        <p className="mt-3 text-[10px] leading-relaxed text-[#71665F] sm:text-xs">Shop with a familiar business in your community.</p>
                      </div>
                      <span className="mt-3 inline-flex w-fit items-center rounded-full bg-[#FFF0E4] px-3 py-2 text-[10px] font-extrabold text-[#D95E10] transition group-hover:bg-[#F36C13] group-hover:text-white">Explore this store <span className="ml-1">→</span></span>
                    </div>
                  </div>
                  <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <div className="grid grid-cols-4 gap-2">
                      {gallery.slice(0,3).map((src, index) => (
                        <div key={src} className="relative aspect-square overflow-hidden rounded-[12px] bg-[#F7E9DF]">
                          <img src={src} alt={index === 0 ? store.business_name + " store interior" : store.business_name + " featured product"} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          {index === 0 && <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[8px] font-semibold text-white">Inside</span>}
                        </div>
                      ))}
                      <div className="flex aspect-square flex-col items-center justify-center rounded-[12px] border border-dashed border-[#E9B995] bg-[#FFF2E8] text-center text-[#D95E10]">
                        <span className="text-[11px] font-black">Explore</span>
                        <span className="mt-0.5 text-[9px] font-semibold">more items</span>
                        <span className="mt-0.5 text-sm">↗</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] font-medium text-[#8B7E75]">Tap to explore products and chat with this store</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : <p className="rounded-2xl border border-dashed border-[#EAD9CB] bg-white/70 p-4 text-sm text-[#77747A]">Local stores will appear here as they join Shop Plug.</p>}
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
        <div className="grid grid-cols-3 items-center gap-4 sm:gap-8">
          <div className="flex h-14 items-center justify-center sm:h-20"><img src="/endorsements/finesse-hair.jpg" alt="Finesse Hair — Affordable Luxury" loading="lazy" className="max-h-full max-w-full object-contain mix-blend-multiply" /></div>
          <div className="flex h-14 items-center justify-center sm:h-20"><img src="/endorsements/josie-cement.jpg" alt="Josie Cement" loading="lazy" className="max-h-full max-w-full object-contain mix-blend-multiply" /></div>
          <div className="flex h-14 items-center justify-center sm:h-20"><img src="/endorsements/gentleman-photography.jpg" alt="Gentleman Photography" loading="lazy" className="max-h-full max-w-full object-contain mix-blend-multiply" /></div>
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
