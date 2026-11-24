"use client";

import { recordLead } from "@/app/s/actions";
import { rememberSource } from "@/lib/store-source";

type Props = {
  vendorId: string;
  slug: string;
  vendorName: string;
  whatsapp: string;
  productId: string;
  productName: string;
  priceLabel: string;
  priceKobo: number | null;
  negotiable: boolean;
  inStock: boolean;
  teamWhatsapp: string;
};

// +2348012345678 -> "0801 234 5678" (how Nigerians read phone numbers).
function localPhone(intl: string): string {
  const digits = intl.replace(/\D/g, "");
  const local = digits.startsWith("234") ? `0${digits.slice(3)}` : digits;
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
}

// The buying buttons on a product page. Every tap is counted as an order lead for the vendor.
export default function BuyActions(p: Props) {
  function log() {
    const source = rememberSource(p.slug, null);
    void recordLead({ vendorId: p.vendorId, source, productId: p.productId, productName: p.productName, priceKobo: p.priceKobo });
  }

  function whatsapp(to: string, message: string) {
    log();
    const productLink = window.location.href.split("?")[0];
    const url = `https://wa.me/${to.replace(/\D/g, "")}?text=${encodeURIComponent(`${message} ${productLink}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => whatsapp(p.whatsapp, `Hi ${p.vendorName}! I'd like to order: ${p.productName} (${p.priceLabel}).`)}
        className="min-h-12 w-full rounded-xl bg-brand font-semibold text-white transition hover:bg-brand-dark"
      >
        {p.inStock ? "Order on WhatsApp" : "Ask about restock on WhatsApp"}
      </button>

      {/* Negotiating by message can lose the buyer while they wait for a reply, so a call is offered instead. */}
      {p.negotiable && (
        <a
          href={`tel:${p.whatsapp.replace(/[^\d+]/g, "")}`}
          onClick={log}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand font-semibold text-brand hover:bg-brand-tint"
        >
          <span aria-hidden="true">📞</span> Call to negotiate · {localPhone(p.whatsapp)}
        </a>
      )}

      {p.teamWhatsapp && (
        <button
          type="button"
          onClick={() => whatsapp(p.teamWhatsapp, `Hi Shop Plug team! I need help buying ${p.productName} from ${p.vendorName}.`)}
          className="min-h-11 w-full text-sm font-medium text-gray-600 hover:text-ink"
        >
          Talk to Shop Plug support
        </button>
      )}
    </div>
  );
}
