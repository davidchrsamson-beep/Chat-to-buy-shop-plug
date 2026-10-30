"use server";

import { mediaBase, presignPut } from "@/lib/r2";
import { requireVendor } from "@/lib/vendor";

export type UploadTarget = { uploadUrl: string; publicUrl: string };
export type UploadPurpose = "product" | "logo" | "hero";

// Hands the vendor's phone short-lived links to upload photos straight to R2.
// Each photo goes into that vendor's own folder, so nobody can overwrite another store's photos.
export async function createUploadTargets(
  count: number,
  purpose: UploadPurpose,
): Promise<{ ok: true; targets: UploadTarget[] } | { ok: false; error: string }> {
  const { vendor } = await requireVendor();
  if (!vendor) return { ok: false, error: "We couldn't find your store." };

  const n = Math.min(Math.max(Math.floor(Number(count) || 0), 0), 24); // up to 24 at once (AI bulk upload)
  const folder: UploadPurpose = ["product", "logo", "hero"].includes(purpose) ? purpose : "product";

  try {
    const targets = await Promise.all(
      Array.from({ length: n }, async () => {
        const key = `vendors/${vendor.id}/${folder}/${crypto.randomUUID()}.jpg`;
        return { uploadUrl: await presignPut(key, "image/jpeg"), publicUrl: `${mediaBase()}/${key}` };
      }),
    );
    return { ok: true, targets };
  } catch (e) {
    console.error("Upload setup failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Photo uploads aren't working right now. Please try again shortly." };
  }
}
