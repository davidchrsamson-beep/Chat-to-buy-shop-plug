import { formatNaira } from "./format";

// Shows a price honestly, the way the vendor set it.
// Negotiable products show the exact amount (the "Negotiable" label says the rest), never "From".
export function formatPrice(p: {
  priceType: string;
  priceKobo: number | null;
  priceMaxKobo: number | null;
  negotiable?: boolean;
}): string {
  if (p.priceType === "ask" || p.priceKobo == null) return "Ask for price";
  if (p.priceType === "from" && !p.negotiable) return `From ${formatNaira(p.priceKobo)}`;
  if (p.priceType === "range" && p.priceMaxKobo) return `${formatNaira(p.priceKobo)} – ${formatNaira(p.priceMaxKobo)}`;
  return formatNaira(p.priceKobo);
}
