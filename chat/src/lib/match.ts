// errand's fair ranking. Pure logic, no database or AI here, so it's easy to read and test.
//
// errand is for the hard-to-find and the urgent ("Baileys delivered to Marian by 1am").
// So besides the listing itself, it checks TIME and PLACE:
//   - Is the store open at the time the buyer needs it?   (closed stores sink, not hidden)
//   - Is the store in, or does it deliver to, the buyer's area?
// Then the listing checks:
//   1. Relevance          does it match what the buyer asked for?
//   2. Price transparency is the price clearly shown (not "ask for price")?
//   3. Fair price         is it in a fair range compared with similar items?
//   4. Looks              more angles = buyer can judge it (matters more for fashion, beauty, home)
//   5. Value for money    evidence in the listing: photos, details, a real description
// Nobody can pay to rank higher. Products with near-equal scores take turns at the top
// (the order reshuffles every hour), so no vendor is permanently stuck at the bottom.

import { deliveryLabel, servesArea } from "./areas";
import { formatMinutes, isOpenAt, statusLabel, type Hours } from "./hours";

export type SearchRow = {
  product_id: string;
  name: string;
  description: string | null;
  attributes: Record<string, unknown> | null;
  price_kobo: number | null;
  price_max_kobo: number | null;
  price_type: string;
  negotiable: boolean;
  price_confirmed_at: string | null;
  created_at: string;
  vendor_id: string;
  business_name: string;
  slug: string;
  whatsapp: string;
  verified: boolean;
  neighbourhood: string | null;
  delivers: boolean;
  delivery_areas: string[] | null;
  delivery_note: string | null;
  open_24h: boolean;
  opens_at: string | null;
  closes_at: string | null;
  open_days: number[] | null;
  standout: string | null;
  subcategory_name: string | null;
  category_slug: string | null;
  photo_count: number;
  image_url: string | null;
  match_kind: "product" | "store" | "type" | "about";
};

export type MoreItem = {
  productId: string;
  name: string;
  priceKobo: number | null;
  priceMaxKobo: number | null;
  priceType: string;
  negotiable: boolean;
  imageUrl: string | null;
};

export type VendorResult = {
  productId: string;
  vendorName: string;
  vendorSlug: string;
  whatsapp: string;
  verified: boolean;
  productName: string;
  priceKobo: number | null;
  priceMaxKobo: number | null;
  priceType: string;
  negotiable: boolean;
  imageUrl: string | null;
  createdAt: string;
  photoCount: number;
  score: number;
  rank: number;
  reasons: string[];
  more: MoreItem[];
  // Time and place
  openNow: boolean | null; // null = store hasn't set hours
  statusText: string | null; // "Open now · till 3am"
  deliveryText: string | null; // "Delivers to Marian, Atekong +3"
  deliveryNote: string | null;
  neighbourhood: string | null;
  standout: string | null;
};

export type MatchContext = {
  terms: string[];
  storeName: string;
  category: string;
  area: string; // a Calabar area from lib/areas, or ""
  at: { day: number; minute: number } | null; // when the buyer needs it (Calabar time), or null
  wantsDelivery?: boolean; // the buyer asked for delivery (typed it, or tapped "Delivered")
};

// Categories where how it looks matters most.
const LOOKS_MATTER = /fashion|cloth|wear|beauty|hair|wig|jewel|accessor|bag|shoe|home|decor|gift/;

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

function median(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Same product + same hour + same search = same position; next hour, near-equals swap around.
function rotation(productId: string, query: string) {
  const seed = `${productId}|${query}|${Math.floor(Date.now() / 3_600_000)}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

const hoursOf = (r: SearchRow): Hours => ({
  open_24h: r.open_24h,
  opens_at: r.opens_at,
  closes_at: r.closes_at,
  open_days: r.open_days,
});

export function rankResults(rows: SearchRow[], ctx: MatchContext, limit = 12): VendorResult[] {
  const { terms, storeName, category, area, at, wantsDelivery } = ctx;
  const termWords = [...new Set(terms.flatMap(words).filter((w) => w.length > 1))];
  const storeWords = words(storeName);
  const queryKey = termWords.join(" ") + "|" + storeWords.join(" ") + "|" + area;

  // Prices of comparable items, per product type (falls back to all matches).
  const priced = (r: SearchRow) => r.price_type !== "ask" && r.price_kobo != null;
  const byType = new Map<string, number[]>();
  for (const r of rows) {
    if (!priced(r)) continue;
    const k = r.subcategory_name ?? "_";
    byType.set(k, [...(byType.get(k) ?? []), r.price_kobo as number]);
  }
  const allPrices = rows.filter(priced).map((r) => r.price_kobo as number);

  const scored = rows.map((r) => {
    const first: string[] = []; // time & place reasons go first: they matter most for urgent requests
    const reasons: string[] = [];
    const name = words(r.name);
    const other = words(
      [r.description ?? "", r.subcategory_name ?? "", ...Object.values(r.attributes ?? {}).map(String)].join(" "),
    );

    // 1. Relevance
    let relevance = 0.4;
    if (termWords.length) {
      const nameHits = termWords.filter((w) => name.some((n) => n.startsWith(w) || w.startsWith(n))).length;
      const otherHits = termWords.filter((w) => other.some((n) => n.startsWith(w))).length;
      relevance = Math.min(1, (2 * nameHits + otherHits) / Math.max(2, termWords.length * 1.2));
      const hit = termWords
        .filter((w) => name.some((n) => n.startsWith(w)))
        .sort((a, b) => b.length - a.length)[0]; // the most specific word, e.g. "straight" over "wig"
      if (hit) reasons.push(`Matches “${hit}”`);
    }
    if (r.match_kind === "about") relevance = Math.min(relevance, 0.3); // matched only the store's description
    const storeHit = storeWords.length > 0 && storeWords.every((w) => words(r.business_name).some((n) => n.startsWith(w)));
    if (storeHit) relevance = 1;
    if (category && r.category_slug === category) relevance = Math.min(1, relevance + 0.15);

    // 2. Price transparency
    const transparency = { fixed: 1, range: 0.85, from: 0.7, ask: 0.3 }[r.price_type] ?? 0.5;
    if (r.price_type === "fixed") reasons.push("Clear price");

    // 3. Fair price (compared with similar items in these results)
    let fair = 0.5;
    if (priced(r)) {
      const peers = (byType.get(r.subcategory_name ?? "_") ?? []).length >= 3 ? byType.get(r.subcategory_name ?? "_")! : allPrices;
      if (peers.length >= 3) {
        const ratio = (r.price_kobo as number) / median(peers);
        fair = ratio <= 1.15 ? 1 : ratio <= 1.5 ? 0.6 : 0.25;
        if (ratio <= 1.15) reasons.push("Fair price");
      } else fair = 0.8;
    }

    // 4. Looks: more angles help the buyer judge (weighted by category)
    const looks = r.photo_count >= 5 ? 1 : r.photo_count === 4 ? 0.8 : 0.6;
    const looksWeight = LOOKS_MATTER.test(r.category_slug ?? "") ? 0.15 : 0.05;
    if (r.photo_count >= 5) reasons.push(`${r.photo_count} photos`);

    // 5. Value for money: evidence in the listing
    const details = Object.values(r.attributes ?? {}).filter((v) => String(v).trim()).length;
    const value = 0.4 * Math.min(1, details / 3) + 0.3 * ((r.description ?? "").trim().length >= 40 ? 1 : 0) + 0.3;

    if (r.negotiable) reasons.push("Negotiable");

    let score =
      (0.45 * relevance + 0.15 * transparency + 0.15 * fair + looksWeight * looks + 0.1 * value) /
      (0.85 + looksWeight);

    // Time: open when the buyer needs it?
    if (at) {
      const open = isOpenAt(hoursOf(r), at.day, at.minute);
      if (open === true) {
        score += 0.15;
        first.push(r.open_24h ? "Open 24 hours" : `Open at ${formatMinutes(at.minute)}`);
      } else if (open === false) score -= 0.3;
      else score -= 0.05; // hours not set: can't promise
    }

    // Place: in the buyer's area, or delivers there?
    if (area) {
      const serves = servesArea(r, area);
      if (serves === "delivers") {
        score += 0.15;
        first.push(`Delivers to ${area}`);
      } else if (serves === "in") {
        score += 0.12;
        first.push(`In ${area}`);
      }
    }

    // Delivery asked for, but no area given: stores that deliver go first.
    if (wantsDelivery && !area) {
      if (r.delivers) {
        score += 0.1;
        first.push("Delivers");
      } else score -= 0.08;
    } else if (wantsDelivery && area && !r.delivers) score -= 0.08;

    return { r, score, storeHit, reasons: [...first, ...reasons].slice(0, 3) };
  });

  // Near-equal products share a band; within a band the order rotates fairly.
  const band = (s: number) => Math.round(s * 12);
  scored.sort(
    (a, b) =>
      Number(b.storeHit) - Number(a.storeHit) ||
      band(b.score) - band(a.score) ||
      rotation(b.r.product_id, queryKey) - rotation(a.r.product_id, queryKey),
  );

  // One card per vendor (their best match); their other matches go under "More from this store".
  const byVendor = new Map<string, VendorResult>();
  for (const { r, score, reasons } of scored) {
    const existing = byVendor.get(r.vendor_id);
    if (existing) {
      if (existing.more.length < 5) {
        existing.more.push({
          productId: r.product_id,
          name: r.name,
          priceKobo: r.price_kobo,
          priceMaxKobo: r.price_max_kobo,
          priceType: r.price_type,
          negotiable: r.negotiable,
          imageUrl: r.image_url,
        });
      }
      continue;
    }
    const status = statusLabel(hoursOf(r));
    byVendor.set(r.vendor_id, {
      productId: r.product_id,
      vendorName: r.business_name,
      vendorSlug: r.slug,
      whatsapp: r.whatsapp,
      verified: r.verified,
      productName: r.name,
      priceKobo: r.price_kobo,
      priceMaxKobo: r.price_max_kobo,
      priceType: r.price_type,
      negotiable: r.negotiable,
      imageUrl: r.image_url,
      createdAt: r.created_at,
      photoCount: r.photo_count,
      score: Math.round(score * 100) / 100,
      rank: 0,
      reasons,
      more: [],
      openNow: status.open,
      statusText: status.text,
      deliveryText: deliveryLabel(r),
      deliveryNote: r.delivery_note,
      neighbourhood: r.neighbourhood,
      standout: r.standout,
    });
  }

  return [...byVendor.values()].slice(0, limit).map((v, i) => ({ ...v, rank: i }));
}
