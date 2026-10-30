"use server";

import { revalidatePath } from "next/cache";
import { CALABAR_AREAS, CALABAR_WIDE } from "@/lib/areas";
import { mediaBase } from "@/lib/r2";
import { normaliseNigerianPhone } from "@/lib/validation";
import { requireVendor } from "@/lib/vendor";

export type StoreSettingsInput = {
  businessName: string;
  tagline: string;
  story: string;
  neighbourhood: string;
  whatsapp: string;
  instagram: string;
  tiktok: string;
  specialOffer: string;
  tickerText: string;
  logo: string | null;
  heroes: string[];
  delivers: boolean;
  deliveryAreas: string[];
  deliveryNote: string;
  open24h: boolean;
  opensAt: string;
  closesAt: string;
  openDays: number[];
  standout: string;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export type SettingsResult = { ok: true } | { ok: false; error: string };

// "@kingofcombo", "instagram.com/kingofcombo/" -> "kingofcombo"
function handle(value: string): string | null | false {
  const v = String(value ?? "")
    .trim()
    .replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  if (!v) return null;
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : false;
}

export async function saveStoreSettings(input: StoreSettingsInput): Promise<SettingsResult> {
  const { supabase, vendor } = await requireVendor();
  if (!vendor) return { ok: false, error: "We couldn't find your store." };

  const businessName = String(input.businessName ?? "").trim();
  if (businessName.length < 2 || businessName.length > 80) return { ok: false, error: "Business name must be 2 to 80 characters." };

  const whatsapp = normaliseNigerianPhone(String(input.whatsapp ?? ""));
  if (!whatsapp) return { ok: false, error: "Enter a Nigerian WhatsApp number, e.g. 08012345678." };

  const instagram = handle(input.instagram);
  const tiktok = handle(input.tiktok);
  if (instagram === false || tiktok === false) return { ok: false, error: "Enter just your Instagram/TikTok username, e.g. @kingofcombo." };

  const allowedPrefix = `${mediaBase()}/vendors/${vendor.id}/`;
  const ownPhoto = (u: unknown): u is string => typeof u === "string" && u.startsWith(allowedPrefix);
  const logo = ownPhoto(input.logo) ? input.logo : null;
  const heroes = (Array.isArray(input.heroes) ? input.heroes : []).filter(ownPhoto).slice(0, 5);

  // Delivery and opening hours (these help errand match urgent, nearby requests).
  const allowedAreas = new Set<string>([CALABAR_WIDE, ...CALABAR_AREAS]);
  const deliveryAreas = [...new Set((Array.isArray(input.deliveryAreas) ? input.deliveryAreas : []).map(String))]
    .filter((a) => allowedAreas.has(a))
    .slice(0, 40);
  const open24h = Boolean(input.open24h);
  const opensAt = String(input.opensAt ?? "").trim();
  const closesAt = String(input.closesAt ?? "").trim();
  if (!open24h && (opensAt || closesAt)) {
    if (!TIME.test(opensAt) || !TIME.test(closesAt)) return { ok: false, error: "Set both opening and closing times, or leave both empty." };
    if (opensAt === closesAt) return { ok: false, error: "Opening and closing times can't be the same. Open all day? Tick “Open 24 hours”." };
  }
  const openDays = [...new Set((Array.isArray(input.openDays) ? input.openDays : []).map(Number))]
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort();
  if (openDays.length === 0) return { ok: false, error: "Pick at least one day you're open." };

  const { error } = await supabase
    .from("vendors")
    .update({
      business_name: businessName,
      tagline: String(input.tagline ?? "").trim().slice(0, 120) || null,
      story: String(input.story ?? "").trim().slice(0, 2000) || null,
      neighbourhood: String(input.neighbourhood ?? "").trim().slice(0, 80) || null,
      whatsapp,
      instagram,
      tiktok,
      special_offer: String(input.specialOffer ?? "").trim().slice(0, 120) || null,
      ticker_text: String(input.tickerText ?? "").trim().slice(0, 80) || null,
      logo_url: logo,
      hero_urls: heroes,
      delivers: Boolean(input.delivers),
      delivery_areas: input.delivers ? deliveryAreas : [],
      delivery_note: String(input.deliveryNote ?? "").trim().slice(0, 140) || null,
      open_24h: open24h,
      opens_at: open24h ? null : opensAt || null,
      closes_at: open24h ? null : closesAt || null,
      open_days: openDays,
      standout: String(input.standout ?? "").trim().slice(0, 140) || null,
    })
    .eq("id", vendor.id);

  if (error) {
    console.error("Store settings save failed:", error.code, error.message);
    return { ok: false, error: "We couldn't save your settings. Please try again." };
  }

  revalidatePath("/vendor/settings");
  revalidatePath(`/s/${vendor.slug}`);
  return { ok: true };
}
