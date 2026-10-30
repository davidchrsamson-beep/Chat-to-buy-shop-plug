import { formatNaira } from "./format";

export type PriceType = "fixed" | "from" | "range" | "ask";

export const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: "Fixed price",
  from: "Starting from",
  range: "Price range",
  ask: "Ask for price",
};

// Shows a price honestly, the way the vendor set it.
// Negotiable products show the exact amount (the "Negotiable" label says the rest), never "From".
export function formatPrice(p: {
  price_type?: string | null;
  price_kobo: number | null;
  price_max_kobo?: number | null;
  negotiable?: boolean | null;
}): string {
  const type = (p.price_type ?? "fixed") as PriceType;
  if (type === "ask" || p.price_kobo == null) return "Ask for price";
  if (type === "from" && !p.negotiable) return `From ${formatNaira(p.price_kobo)}`;
  if (type === "range" && p.price_max_kobo) return `${formatNaira(p.price_kobo)} – ${formatNaira(p.price_max_kobo)}`;
  return formatNaira(p.price_kobo);
}

// "29 October" in Lagos time.
export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", timeZone: "Africa/Lagos" }).format(new Date(iso));
}
