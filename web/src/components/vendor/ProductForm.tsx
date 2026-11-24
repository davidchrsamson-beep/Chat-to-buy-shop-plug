"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProduct, type ProductInput } from "@/app/vendor/products/actions";
import { Field } from "@/components/ui/fields";
import { fieldsFor } from "@/lib/attributes";
import { PRICE_TYPE_LABELS, type PriceType } from "@/lib/price";
import type { CategoryOption } from "@/lib/vendor";
import PhotoPicker, { photosFromUrls, type Photo } from "./PhotoPicker";

export type ProductInitial = {
  id: string;
  name: string;
  description: string;
  subcategoryId: number | null;
  priceType: PriceType;
  priceNaira: string;
  priceMaxNaira: string;
  negotiable: boolean;
  inStock: boolean;
  attributes: Record<string, string>;
  photos: string[];
  status: string;
};

const MAX_PHOTOS = 8;

export default function ProductForm({
  categories,
  minSearchPhotos,
  initial,
}: {
  categories: CategoryOption[];
  minSearchPhotos: number;
  initial?: ProductInitial;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>(() => photosFromUrls(initial?.photos ?? []));
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId ? String(initial.subcategoryId) : "");
  const [priceType, setPriceType] = useState<PriceType>(initial?.priceType ?? "fixed");
  const [price, setPrice] = useState(initial?.priceNaira ?? "");
  const [priceMax, setPriceMax] = useState(initial?.priceMaxNaira ?? "");
  const [negotiable, setNegotiable] = useState(initial?.negotiable ?? false);
  const [inStock, setInStock] = useState(initial?.inStock ?? true);
  const [attributes, setAttributes] = useState<Record<string, string>>(initial?.attributes ?? {});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categorySlug =
    categories.find((c) => c.subcategories.some((s) => String(s.id) === subcategoryId))?.slug ?? null;
  const detailFields = fieldsFor(categorySlug);
  const uploading = photos.some((p) => p.status === "uploading");
  const readyUrls = photos.filter((p) => p.status === "ready" && p.url).map((p) => p.url as string);
  const missing = Math.max(0, minSearchPhotos - readyUrls.length);
  const busy = isPending || uploading;

  function resetForNext() {
    setPhotos([]);
    setName("");
    setDescription("");
    setPrice("");
    setPriceMax("");
    setNegotiable(false);
    setInStock(true);
    setAttributes({});
    // Product type and price type stay, because vendors often add similar items in a row.
  }

  function submit(publish: boolean, addAnother: boolean) {
    setError(null);
    setSaved(null);
    const input: ProductInput = {
      id: initial?.id,
      name,
      description,
      subcategoryId: subcategoryId ? Number(subcategoryId) : null,
      priceType,
      priceNaira: price,
      priceMaxNaira: priceMax,
      negotiable,
      inStock,
      attributes,
      photos: readyUrls,
      publish,
    };
    startTransition(async () => {
      const res = await saveProduct(input);
      if (!res.ok) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (addAnother) {
        setSaved(`Saved “${name}”. Add the next one.`);
        resetForNext();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push("/vendor/products");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</p>
      )}
      {saved && (
        <p role="status" className="rounded-xl border border-brand/30 bg-brand-tint px-4 py-3 text-sm text-brand-dark">✓ {saved}</p>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <PhotoPicker
          label="Photos"
          photos={photos}
          setPhotos={setPhotos}
          max={MAX_PHOTOS}
          purpose="product"
          hint={
            missing > 0 ? (
              <span className="text-amber-700">
                Add {missing} more {missing === 1 ? "photo" : "photos"} from different angles (front, back, close-up) so
                this product can appear in Find a Plug search and the market.
              </span>
            ) : (
              <span className="text-brand-dark">✓ Enough angles to appear in search.</span>
            )
          }
        />
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <Field
          label="Product name"
          name="name"
          placeholder="e.g. Red lace owambe gown"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div>
          <label htmlFor="subcategory" className="mb-1.5 block text-xs font-medium text-gray-600">Product type</label>
          <select
            id="subcategory"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Choose a type…</option>
            {categories.map((c) => (
              <optgroup key={c.slug} label={c.name}>
                {c.subcategories.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-xs font-medium text-gray-600">Description (optional)</label>
          <textarea
            id="description"
            rows={3}
            maxLength={2000}
            placeholder="What makes it special? Fabric, fit, what's included…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-gray-600">Price</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={priceType === t}
                onClick={() => setPriceType(t)}
                className={`min-h-11 rounded-full px-4 text-sm transition ${
                  priceType === t ? "bg-ink font-semibold text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {PRICE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>

        {priceType !== "ask" && (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label={priceType === "range" ? "Lowest price (₦)" : "Price (₦)"}
              name="price"
              inputMode="numeric"
              placeholder="e.g. 25000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            {priceType === "range" && (
              <Field
                label="Highest price (₦)"
                name="priceMax"
                inputMode="numeric"
                placeholder="e.g. 35000"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            )}
          </div>
        )}
        {priceType === "ask" && (
          <p className="text-xs text-amber-700">
            Buyers prefer clear prices. Products with a shown price rank higher in search.
          </p>
        )}

        <Toggle label="Price is negotiable" hint="Buyers will see “Negotiable” and can offer a price on WhatsApp." checked={negotiable} onChange={setNegotiable} />
        <Toggle label="In stock" hint="Out-of-stock products stay on your storefront but leave search." checked={inStock} onChange={setInStock} />
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold">Details</h2>
          <p className="text-xs text-gray-500">These help Find a Plug match your product to what buyers ask for.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {detailFields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              name={f.key}
              placeholder={f.placeholder}
              maxLength={60}
              value={attributes[f.key] ?? ""}
              onChange={(e) => setAttributes((a) => ({ ...a, [f.key]: e.target.value }))}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2 pb-10 sm:flex-row-reverse">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(true, false)}
          className="min-h-12 flex-1 rounded-xl bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Saving…" : uploading ? "Waiting for photos…" : initial?.status === "live" ? "Save changes" : "Publish"}
        </button>
        {!initial && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit(true, true)}
            className="min-h-12 flex-1 rounded-xl border border-brand px-5 font-semibold text-brand disabled:opacity-60"
          >
            Publish &amp; add another
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => submit(false, false)}
          className="min-h-12 rounded-xl px-5 text-sm font-medium text-gray-600 hover:text-ink disabled:opacity-60"
        >
          {initial?.status === "live" ? "Move to drafts" : "Save as draft"}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-brand"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );
}
