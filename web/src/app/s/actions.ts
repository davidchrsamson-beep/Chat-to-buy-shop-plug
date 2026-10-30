"use server";

import { createClient } from "@/lib/supabase/server";

const SOURCES = ["market", "chat", "direct"] as const;
type Source = (typeof SOURCES)[number];
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
const toSource = (v: unknown): Source => (SOURCES.includes(v as Source) ? (v as Source) : "direct");

// One visit per buyer per store per browsing session (counted in the storefront).
export async function recordVisit(vendorId: string, source: string) {
  if (!isId(vendorId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("visits").insert({ vendor_id: vendorId, source: toSource(source) });
  if (error) console.error("Visit log failed:", error.code, error.message);
}

// A buyer tapped a WhatsApp button: this is the "order lead" vendors see on their dashboard.
export async function recordLead(input: {
  vendorId: string;
  source: string;
  productId: string;
  productName: string;
  priceKobo: number | null;
}) {
  if (!isId(input.vendorId)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    vendor_id: input.vendorId,
    source: toSource(input.source),
    items: [
      {
        product_id: isId(input.productId) ? input.productId : null,
        name: String(input.productName ?? "").slice(0, 120),
        price_kobo: Number.isFinite(input.priceKobo) ? input.priceKobo : null,
      },
    ],
    total_kobo: Number.isFinite(input.priceKobo) && input.priceKobo ? input.priceKobo : 0,
  });
  if (error) console.error("Lead log failed:", error.code, error.message);
}
