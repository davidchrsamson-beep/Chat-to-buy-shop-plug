"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { draftProductsWithAI, saveTickerLine, type DraftProduct } from "@/app/vendor/products/ai/actions";
import { saveProduct } from "@/app/vendor/products/actions";
import { Field } from "@/components/ui/fields";
import { fieldsFor } from "@/lib/attributes";
import { PRICE_TYPE_LABELS, type PriceType } from "@/lib/price";
import type { CategoryOption } from "@/lib/vendor";
import PhotoPicker, { type Photo } from "./PhotoPicker";

type Card = DraftProduct & {
  key: string;
  priceType: PriceType;
  price: string;
  priceMax: string;
  negotiable: boolean;
  inStock: boolean;
  state: "draft" | "saving" | "saved" | "error";
  error?: string;
};

const MAX_PHOTOS = 24;

// Step 1: drop in all photos. Step 2: AI groups the angles and writes each listing.
// Step 3: the vendor checks each card, types the price, and publishes all at once.
export default function AiBulkUploader({
  categories,
  minSearchPhotos,
  photosLeft,
}: {
  categories: CategoryOption[];
  minSearchPhotos: number;
  photosLeft: number;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [ticker, setTicker] = useState("");
  const [tickerState, setTickerState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [left, setLeft] = useState(photosLeft);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const ready = photos.filter((p) => p.status === "ready" && p.url).map((p) => p.url as string);
  const uploading = photos.some((p) => p.status === "uploading");
  const allSaved = cards.length > 0 && cards.every((c) => c.state === "saved");

  function draft() {
    setError(null);
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof draftProductsWithAI>>;
      try {
        res = await draftProductsWithAI(ready);
      } catch {
        // Never fail silently: tell the vendor, and the terminal has the reason.
        setError("Something went wrong while the AI was working. Please try again with fewer photos, or add the products manually.");
        return;
      }
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLeft(res.photosLeft);
      setTicker(res.tickerLine);
      setCards(
        res.drafts.map((d, i) => ({
          ...d,
          key: `${i}-${d.photos[0]}`,
          priceType: "fixed",
          price: "",
          priceMax: "",
          negotiable: false,
          inStock: true,
          state: "draft",
        })),
      );
    });
  }

  const update = (key: string, patch: Partial<Card>) =>
    setCards((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  function publishAll() {
    setError(null);
    startTransition(async () => {
      // One at a time, so a slow connection never saves half a product.
      for (const c of cards) {
        if (c.state === "saved") continue;
        update(c.key, { state: "saving", error: undefined });
        const res = await saveProduct({
          name: c.name,
          description: c.description,
          subcategoryId: c.subcategoryId,
          priceType: c.priceType,
          priceNaira: c.price,
          priceMaxNaira: c.priceMax,
          negotiable: c.negotiable,
          inStock: c.inStock,
          attributes: c.attributes,
          photos: c.photos,
          publish: true,
        });
        update(c.key, res.ok ? { state: "saved" } : { state: "error", error: res.error });
      }
      router.refresh();
    });
  }

  // ---------- Step 1: photos ----------
  if (cards.length === 0) {
    return (
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <PhotoPicker
            label={`Photos of all the products you want to add (up to ${MAX_PHOTOS})`}
            photos={photos}
            setPhotos={setPhotos}
            max={MAX_PHOTOS}
            purpose="product"
            hint={
              <span className="text-gray-500">
                Take {minSearchPhotos} or more angles of each item (front, back, close-up). Add them all at once, in any order:
                the AI works out which photos belong together.
              </span>
            }
          />
        </section>
        <p className="text-xs text-gray-500">AI allowance left this month: {left} photos.</p>
        <button
          type="button"
          onClick={draft}
          disabled={isPending || uploading || ready.length === 0}
          className="min-h-12 w-full rounded-xl bg-brand font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "The AI is looking at your photos…" : uploading ? "Waiting for photos…" : "✨ Let AI fill in the details"}
        </button>
      </div>
    );
  }

  // ---------- Steps 2 & 3: check the drafts, add prices, publish ----------
  return (
    <div className="space-y-4 pb-10">
      {error && <Alert>{error}</Alert>}

      <p className="rounded-xl border border-brand/30 bg-brand-tint px-4 py-3 text-sm text-brand-dark">
        ✨ The AI found <strong>{cards.length}</strong> {cards.length === 1 ? "product" : "products"}. Check each one, add the
        price, then publish them all.
      </p>

      {tickerState === "saved" && (
        <p role="status" className="rounded-xl border border-brand/30 bg-brand-tint px-4 py-3 text-sm text-brand-dark">
          ✓ Saved. Your moving line now runs across the top of your storefront. Change it any time in Settings.
        </p>
      )}
      {tickerState === "error" && <Alert>We couldn&apos;t save the moving line. Please try again, or set it in Settings.</Alert>}

      {ticker && tickerState !== "saved" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">Suggested moving line for your storefront</p>
            <input
              aria-label="Suggested moving line"
              value={ticker}
              maxLength={80}
              onChange={(e) => setTicker(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold uppercase tracking-wide"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              setTickerState("saving");
              try {
                setTickerState((await saveTickerLine(ticker)).ok ? "saved" : "error");
              } catch {
                setTickerState("error");
              }
            }}
            disabled={tickerState === "saving"}
            className="min-h-11 rounded-xl border border-brand px-4 text-sm font-semibold text-brand disabled:opacity-60"
          >
            {tickerState === "saving" ? "Saving…" : "Use this line"}
          </button>
        </div>
      )}

      {cards.map((c, i) => {
        const categorySlug = categories.find((cat) => cat.subcategories.some((s) => s.id === c.subcategoryId))?.slug ?? null;
        const fewPhotos = c.photos.length < minSearchPhotos;
        return (
          <section
            key={c.key}
            aria-label={`Product ${i + 1}`}
            className={`space-y-3 rounded-2xl bg-white p-4 shadow-sm ${c.state === "saved" ? "opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Product {i + 1}</h2>
              {c.state === "saved" && <span className="text-sm font-semibold text-brand">✓ Published</span>}
              {c.state === "saving" && <span className="text-sm text-gray-500">Saving…</span>}
              {c.state === "draft" && (
                <button
                  type="button"
                  onClick={() => setCards((list) => list.filter((x) => x.key !== c.key))}
                  className="min-h-11 text-sm text-gray-500 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>

            <ul className="flex gap-2 overflow-x-auto">
              {c.photos.map((url) => (
                <li key={url} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
            {fewPhotos && (
              <p className="text-xs text-amber-700">
                Only {c.photos.length} {c.photos.length === 1 ? "photo" : "photos"}: it will show on your storefront, but needs{" "}
                {minSearchPhotos} to appear in search. You can add more later from Products.
              </p>
            )}
            {c.state === "error" && c.error && <Alert>{c.error}</Alert>}

            <Field label="Name" value={c.name} maxLength={120} onChange={(e) => update(c.key, { name: e.target.value })} />

            <div>
              <label htmlFor={`type-${c.key}`} className="mb-1.5 block text-xs font-medium text-gray-600">Product type</label>
              <select
                id={`type-${c.key}`}
                value={c.subcategoryId ?? ""}
                onChange={(e) => update(c.key, { subcategoryId: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base"
              >
                <option value="">Choose a type…</option>
                {categories.map((cat) => (
                  <optgroup key={cat.slug} label={cat.name}>
                    {cat.subcategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`desc-${c.key}`} className="mb-1.5 block text-xs font-medium text-gray-600">Description</label>
              <textarea
                id={`desc-${c.key}`}
                rows={2}
                maxLength={2000}
                value={c.description}
                onChange={(e) => update(c.key, { description: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fieldsFor(categorySlug).map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  placeholder={f.placeholder}
                  maxLength={60}
                  value={c.attributes[f.key] ?? ""}
                  onChange={(e) => update(c.key, { attributes: { ...c.attributes, [f.key]: e.target.value } })}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor={`pt-${c.key}`} className="mb-1.5 block text-xs font-medium text-gray-600">Price type</label>
                <select
                  id={`pt-${c.key}`}
                  value={c.priceType}
                  onChange={(e) => update(c.key, { priceType: e.target.value as PriceType })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base"
                >
                  {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((t) => (
                    <option key={t} value={t}>{PRICE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              {c.priceType !== "ask" && (
                <Field
                  label={c.priceType === "range" ? "Lowest (₦)" : "Price (₦)"}
                  inputMode="numeric"
                  placeholder="e.g. 25000"
                  value={c.price}
                  onChange={(e) => update(c.key, { price: e.target.value })}
                />
              )}
              {c.priceType === "range" && (
                <Field
                  label="Highest (₦)"
                  inputMode="numeric"
                  value={c.priceMax}
                  onChange={(e) => update(c.key, { priceMax: e.target.value })}
                />
              )}
            </div>

            <div className="flex flex-wrap gap-x-6">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-brand" checked={c.negotiable} onChange={(e) => update(c.key, { negotiable: e.target.checked })} />
                Negotiable
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="h-5 w-5 accent-brand" checked={c.inStock} onChange={(e) => update(c.key, { inStock: e.target.checked })} />
                In stock
              </label>
            </div>
          </section>
        );
      })}

      {allSaved ? (
        <button
          type="button"
          onClick={() => router.push("/vendor/products")}
          className="min-h-12 w-full rounded-xl bg-brand font-semibold text-white"
        >
          Done, see my products
        </button>
      ) : (
        <button
          type="button"
          onClick={publishAll}
          disabled={isPending}
          className="min-h-12 w-full rounded-xl bg-brand font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {isPending ? "Publishing…" : `Publish all ${cards.filter((c) => c.state !== "saved").length}`}
        </button>
      )}
    </div>
  );
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      ⚠ {children}
    </p>
  );
}
