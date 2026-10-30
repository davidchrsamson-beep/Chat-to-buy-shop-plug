"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { recordVisit } from "@/app/s/actions";
import { firstVisitThisSession, rememberSource } from "@/lib/store-source";

// The storefront's top bar: Back (only for buyers who came from the Ndu market),
// the store's name, and a green Chat button to the vendor's WhatsApp.
export default function StoreHeader({
  vendorId,
  slug,
  name,
  logoUrl,
  whatsapp,
  from,
}: {
  vendorId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  whatsapp: string;
  from: string | null;
}) {
  const [cameFromMarket, setCameFromMarket] = useState(false);

  useEffect(() => {
    const source = rememberSource(slug, from);
    setCameFromMarket(source === "market");
    if (firstVisitThisSession(slug)) void recordVisit(vendorId, source);
  }, [slug, from, vendorId]);

  const chatLink = `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${name}! I found your store on Ndu.`)}`;

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {cameFromMarket && (
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign("/"))}
              className="min-h-11 shrink-0 pr-1 text-sm text-gray-600 hover:text-ink"
            >
              ‹ Back
            </button>
          )}
          <Link href={`/s/${slug}`} className="flex min-w-0 items-center gap-2">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            )}
            <span className="truncate font-semibold">{name}</span>
          </Link>
        </div>
        <a
          href={chatLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 shrink-0 items-center rounded-full border border-brand px-4 text-sm font-semibold text-brand hover:bg-brand-tint"
        >
          Chat
        </a>
      </div>
    </header>
  );
}
