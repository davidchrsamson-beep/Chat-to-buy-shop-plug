"use client";

import { useState, useTransition } from "react";
import { saveStoreSettings, type StoreSettingsInput } from "@/app/vendor/settings/actions";
import { Field } from "@/components/ui/fields";
import { CALABAR_AREAS, CALABAR_WIDE } from "@/lib/areas";
import { DAY_NAMES } from "@/lib/hours";
import type { CurrentVendor } from "@/lib/vendor";
import PhotoPicker, { photosFromUrls, type Photo } from "./PhotoPicker";

// Turns +2348012345678 back into 08012345678 for editing.
const localNumber = (n: string) => (n.startsWith("+234") ? `0${n.slice(4)}` : n);

export default function StoreSettingsForm({ vendor }: { vendor: CurrentVendor }) {
  const [logo, setLogo] = useState<Photo[]>(() => photosFromUrls(vendor.logo_url ? [vendor.logo_url] : []));
  const [heroes, setHeroes] = useState<Photo[]>(() => photosFromUrls(vendor.hero_urls ?? []));
  const [form, setForm] = useState({
    businessName: vendor.business_name,
    tagline: vendor.tagline ?? "",
    story: vendor.story ?? "",
    neighbourhood: vendor.neighbourhood ?? "",
    whatsapp: localNumber(vendor.whatsapp),
    instagram: vendor.instagram ?? "",
    tiktok: vendor.tiktok ?? "",
    specialOffer: vendor.special_offer ?? "",
    tickerText: vendor.ticker_text ?? "",
    deliveryNote: vendor.delivery_note ?? "",
    opensAt: (vendor.opens_at ?? "").slice(0, 5),
    closesAt: (vendor.closes_at ?? "").slice(0, 5),
    standout: vendor.standout ?? "",
  });
  const [delivers, setDelivers] = useState(vendor.delivers ?? false);
  const [areas, setAreas] = useState<string[]>(vendor.delivery_areas ?? []);
  const [open24h, setOpen24h] = useState(vendor.open_24h ?? false);
  const [days, setDays] = useState<number[]>(vendor.open_days?.length ? vendor.open_days : [0, 1, 2, 3, 4, 5, 6]);
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const uploading = [...logo, ...heroes].some((p) => p.status === "uploading");
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function save() {
    setMessage(null);
    const input: StoreSettingsInput = {
      ...form,
      logo: logo.find((p) => p.status === "ready")?.url ?? null,
      heroes: heroes.filter((p) => p.status === "ready" && p.url).map((p) => p.url as string),
      delivers,
      deliveryAreas: areas,
      open24h,
      openDays: days,
    };
    startTransition(async () => {
      const res = await saveStoreSettings(input);
      setMessage(res.ok ? { ok: true, text: "Saved. Your storefront is updated." } : { ok: false, text: res.error });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <div className="space-y-5 pb-10">
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.ok ? "border-brand/30 bg-brand-tint text-brand-dark" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.ok ? "✓" : "⚠"} {message.text}
        </p>
      )}

      <section className="space-y-5 rounded-2xl bg-white p-4 shadow-sm">
        <PhotoPicker label="Logo" photos={logo} setPhotos={setLogo} max={1} purpose="logo" />
        <PhotoPicker
          label="Cover photos (shown at the top of your storefront)"
          photos={heroes}
          setPhotos={setHeroes}
          max={5}
          purpose="hero"
          hint={<span className="text-gray-500">Wide photos of your best pieces, your shop or you modelling them work best.</span>}
        />
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <Field label="Business name" name="businessName" maxLength={80} value={form.businessName} onChange={set("businessName")} />
        <Field label="Tagline" name="tagline" maxLength={120} placeholder="Your Style. Your Story." value={form.tagline} onChange={set("tagline")} />
        <div>
          <label htmlFor="story" className="mb-1.5 block text-xs font-medium text-gray-600">About your store</label>
          <textarea
            id="story"
            rows={4}
            maxLength={2000}
            placeholder="How you started, what you're known for, how you deliver…"
            value={form.story}
            onChange={set("story")}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <Field
          label="Announcement (moves across the top of your storefront)"
          name="specialOffer"
          maxLength={120}
          placeholder="e.g. 10% off all Ankara this week"
          value={form.specialOffer}
          onChange={set("specialOffer")}
        />
        <Field
          label="Your moving display line (moves across the top of your storefront)"
          name="tickerText"
          maxLength={80}
          placeholder="e.g. The coziest gift shop in Calabar"
          hint="Short and catchy works best, like a sign outside your shop."
          value={form.tickerText}
          onChange={set("tickerText")}
        />
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <Field label="WhatsApp number (buyers order here)" name="whatsapp" type="tel" inputMode="tel" value={form.whatsapp} onChange={set("whatsapp")} />
        <Field label="Neighbourhood" name="neighbourhood" maxLength={80} placeholder="e.g. Marian, Watt, Calabar South" value={form.neighbourhood} onChange={set("neighbourhood")} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instagram" name="instagram" placeholder="@yourstore" value={form.instagram} onChange={set("instagram")} />
          <Field label="TikTok" name="tiktok" placeholder="@yourstore" value={form.tiktok} onChange={set("tiktok")} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="delivery-heading">
        <div>
          <h2 id="delivery-heading" className="font-semibold">Delivery &amp; opening hours</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Find a Plug uses this to match urgent requests, like “drinks delivered to Marian by 1am”. Stores that deliver and
            are open at the time a buyer needs show up first.
          </p>
        </div>

        <Field
          label="What makes you different? (shown to buyers in Find a Plug)"
          name="standout"
          maxLength={140}
          placeholder="e.g. Drinks delivered till 3am, even on Sundays"
          value={form.standout}
          onChange={set("standout")}
        />

        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-5 w-5 accent-brand" checked={delivers} onChange={(e) => setDelivers(e.target.checked)} />
          I deliver
        </label>

        {delivers && (
          <>
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-gray-600">Where do you deliver?</legend>
              <div className="flex flex-wrap gap-2">
                {[CALABAR_WIDE, ...CALABAR_AREAS].map((a) => {
                  const on = areas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAreas((list) => toggle(list, a))}
                      className={`min-h-10 rounded-full border px-3 text-sm transition ${
                        on ? "border-brand bg-brand text-white" : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field
              label="Delivery details"
              name="deliveryNote"
              maxLength={140}
              placeholder="e.g. Within 1 hour · ₦1,000 in Calabar South, ₦1,500 elsewhere"
              value={form.deliveryNote}
              onChange={set("deliveryNote")}
            />
          </>
        )}

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-gray-600">Days you&apos;re open</legend>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((d, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays((list) => toggle(list, i))}
                  className={`min-h-10 min-w-12 rounded-full border px-3 text-sm transition ${
                    on ? "border-brand bg-brand text-white" : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-5 w-5 accent-brand" checked={open24h} onChange={(e) => setOpen24h(e.target.checked)} />
          Open 24 hours
        </label>

        {!open24h && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opens at" name="opensAt" type="time" value={form.opensAt} onChange={set("opensAt")} />
            <Field
              label="Closes at"
              name="closesAt"
              type="time"
              value={form.closesAt}
              onChange={set("closesAt")}
              hint="Close after midnight? Fine: e.g. 6pm to 3am."
            />
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={save}
        disabled={isPending || uploading}
        className="min-h-12 w-full rounded-xl bg-brand font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {isPending ? "Saving…" : uploading ? "Waiting for photos…" : "Save settings"}
      </button>
    </div>
  );
}
