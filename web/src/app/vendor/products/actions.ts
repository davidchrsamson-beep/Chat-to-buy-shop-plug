"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mediaBase } from "@/lib/r2";
import { requireVendor } from "@/lib/vendor";

export type ProductInput = {
  id?: string;
  name: string;
  description: string;
  subcategoryId: number | null;
  priceType: "fixed" | "from" | "range" | "ask";
  priceNaira: string;
  priceMaxNaira: string;
  negotiable: boolean;
  inStock: boolean;
  attributes: Record<string, string>;
  photos: string[];
  publish: boolean;
};

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

const PRICE_TYPES = ["fixed", "from", "range", "ask"] as const;

// "25,000" or "₦25000" -> 2500000 kobo. Money is always stored as whole kobo.
function toKobo(value: string): number | null {
  const n = Number(String(value ?? "").replace(/[,\s₦]/g, ""));
  return Number.isFinite(n) && n > 0 && n <= 1_000_000_000 ? Math.round(n * 100) : null;
}

function fail(message: string): SaveResult {
  return { ok: false, error: message };
}

export async function saveProduct(input: ProductInput): Promise<SaveResult> {
  const { supabase, vendor } = await requireVendor();
  if (!vendor) return fail("We couldn't find your store.");

  // ---- Check everything on the server ----
  const name = String(input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) return fail("Give the product a name (2 to 120 characters).");
  const description = String(input.description ?? "").trim().slice(0, 2000);

  const priceType = PRICE_TYPES.includes(input.priceType) ? input.priceType : "fixed";
  const price = priceType === "ask" ? null : toKobo(input.priceNaira);
  const priceMax = priceType === "range" ? toKobo(input.priceMaxNaira) : null;
  if (priceType !== "ask" && price === null) return fail("Enter a price, or choose “Ask for price”.");
  if (priceType === "range" && (priceMax === null || price === null || priceMax < price)) {
    return fail("For a price range, the highest price must be more than the lowest.");
  }

  // The product type must belong to one of this store's categories.
  let subcategoryId: number | null = null;
  if (input.subcategoryId != null) {
    const [{ data: sub }, { data: cats }] = await Promise.all([
      supabase.from("subcategories").select("id, category_id").eq("id", input.subcategoryId).maybeSingle(),
      supabase.from("vendor_categories").select("category_id").eq("vendor_id", vendor.id),
    ]);
    if (!sub || !(cats ?? []).some((c) => c.category_id === sub.category_id)) {
      return fail("Pick a product type from your store's categories.");
    }
    subcategoryId = sub.id as number;
  }

  // Only photos uploaded into THIS store's folder are accepted.
  const allowedPrefix = `${mediaBase()}/vendors/${vendor.id}/`;
  const photos = (Array.isArray(input.photos) ? input.photos : [])
    .filter((u) => typeof u === "string" && u.startsWith(allowedPrefix))
    .slice(0, 8);
  if (input.publish && photos.length === 0) return fail("Add at least one photo before publishing.");

  const attributes: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.attributes ?? {})) {
    if (/^[a-z_]{2,20}$/.test(key) && typeof value === "string" && value.trim()) {
      attributes[key] = value.trim().slice(0, 60);
    }
  }

  const row = {
    name,
    description: description || null,
    subcategory_id: subcategoryId,
    price_type: priceType,
    price_kobo: price,
    price_max_kobo: priceMax,
    negotiable: Boolean(input.negotiable),
    in_stock: Boolean(input.inStock),
    attributes,
    status: input.publish ? "live" : "draft",
    price_confirmed_at: new Date().toISOString(), // saving = the vendor confirms the price today
  };

  // ---- Save the product ----
  let id = typeof input.id === "string" && /^[0-9a-f-]{36}$/.test(input.id) ? input.id : undefined;
  if (id) {
    const { data, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .eq("vendor_id", vendor.id)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) return logAndFail("update", error);
    const { error: mediaError } = await supabase.from("product_media").delete().eq("product_id", id).eq("vendor_id", vendor.id);
    if (mediaError) return logAndFail("clear photos", mediaError);
  } else {
    const { data, error } = await supabase.from("products").insert({ ...row, vendor_id: vendor.id }).select("id").single();
    if (error || !data) return logAndFail("create", error);
    id = data.id as string;
  }

  // ---- Save its photos, in the order the vendor chose (first = cover) ----
  if (photos.length > 0) {
    const { error } = await supabase.from("product_media").insert(
      photos.map((url, i) => ({ product_id: id, vendor_id: vendor.id, url, type: "image", sort_order: i })),
    );
    if (error) return logAndFail("save photos", error);
  }

  revalidatePath("/vendor/products");
  revalidatePath(`/s/${vendor.slug}`);
  return { ok: true, id };
}

// Soft delete: hidden everywhere, but recoverable by Ndu support if done by mistake.
export async function deleteProduct(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, vendor } = await requireVendor();
  if (vendor && /^[0-9a-f-]{36}$/.test(id)) {
    await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), status: "hidden" })
      .eq("id", id)
      .eq("vendor_id", vendor.id);
    revalidatePath("/vendor/products");
    revalidatePath(`/s/${vendor.slug}`);
  }
  redirect("/vendor/products");
}

function logAndFail(step: string, error: { code?: string; message?: string } | null): SaveResult {
  console.error(`Product ${step} failed:`, error?.code, error?.message);
  return fail("We couldn't save this product. Please try again.");
}
