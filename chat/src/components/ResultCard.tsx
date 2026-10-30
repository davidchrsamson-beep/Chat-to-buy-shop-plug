import type { VendorResult } from "@/app/actions";
import { formatPrice } from "@/lib/price";

// One result: photo, price, item, vendor, why it was picked, and ways to buy.
export default function ResultCard({
  r,
  marketUrl,
  moreOpen,
  onToggleMore,
}: {
  r: VendorResult;
  marketUrl: string;
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const priceLabel = formatPrice(r);
  // Opens the product on the vendor's free storefront; ?from=chat tells the store errand sent this buyer.
  const productLink = `${marketUrl}/s/${r.vendorSlug}/p/${r.productId}?from=chat`;
  const message = `Hi ${r.vendorName}! I found your ${r.productName} (${priceLabel}) on errand by Ndu. Is it available? ${productLink.split("?")[0]}`;
  const whatsappLink = `https://wa.me/${r.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

  return (
    <article className="flex w-56 shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border border-line bg-panel">
      <a href={productLink} target="_blank" rel="noopener noreferrer" className="relative block h-40 bg-[var(--placeholder)]">
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt={r.productName} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-mute">No photo yet</div>
        )}
        {r.verified && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2 py-1 text-[11px] font-bold text-night">Verified</span>
        )}
        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-night/75 px-2 py-0.5 text-[11px]">{r.photoCount} photos</span>
      </a>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <span className="text-lg font-bold">{priceLabel}</span>
        <span className="truncate text-[13px] text-mute">{r.productName}</span>
        <span className="truncate text-sm font-medium">{r.vendorName}</span>

        {/* Time and place: what matters most when you need it now */}
        {r.statusText && (
          <span className={`flex items-center gap-1.5 text-xs ${r.openNow ? "text-[var(--ok)]" : "text-mute"}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${r.openNow ? "bg-[var(--ok)]" : "bg-mute"}`} />
            {r.statusText}
          </span>
        )}
        {r.deliveryText && (
          <span className="truncate text-xs text-mute" title={r.deliveryNote ?? undefined}>
            🛵 {r.deliveryText}
          </span>
        )}
        {!r.deliveryText && r.neighbourhood && <span className="truncate text-xs text-mute">📍 {r.neighbourhood}</span>}
        {r.standout && <span className="mt-1 line-clamp-2 text-xs italic leading-snug">“{r.standout}”</span>}

        {r.reasons.length > 0 && (
          <ul aria-label="Why errand picked this" className="mt-1.5 flex flex-wrap gap-1">
            {r.reasons.map((reason) => (
              <li key={reason} className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-mute">
                {reason}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2.5">
          <a
            href={productLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center rounded-2xl bg-accent text-[13px] font-bold text-night"
          >
            See store
          </a>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center rounded-2xl border border-line-strong text-[13px] font-semibold"
          >
            WhatsApp
          </a>
        </div>
        {r.more.length > 0 && (
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={onToggleMore}
            className="mt-1.5 h-10 rounded-2xl text-[13px] font-semibold text-accent"
          >
            {moreOpen ? "Hide" : `+${r.more.length} more from this store`}
          </button>
        )}
      </div>
    </article>
  );
}
