"use client";

import Link from "next/link";
import { useState } from "react";
import {
  deleteStripItem,
  listStrip,
  reorderStrip,
  saveStripItem,
  setStripActive,
  stripUploadTarget,
  type StripItem,
} from "@/app/team/strip/actions";
import { CALABAR_AREAS } from "@/lib/areas";
import { compressImage } from "@/lib/images";

const WHEN = ["Today", "This morning", "This afternoon", "Tonight", "Last night", "Yesterday"];
const input = "min-h-11 w-full rounded-xl border border-gray-200 px-3 text-base focus:border-brand focus:outline-none";

// Arrange the "recently delivered" strip on the Shop Plug home screen:
// order (↑ ↓), captions, show/hide, delete, and add new photos.
export default function StripManager({ initial, shorUrl }: { initial: StripItem[]; shorUrl: string }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const src = (url: string) => (url.startsWith("/") ? `${shorUrl}${url}` : url);
  const flash = (msg: string) => {
    setSaved(msg);
    setTimeout(() => setSaved(null), 2000);
  };
  const reload = async () => setItems(await listStrip());

  async function move(i: number, step: -1 | 1) {
    const j = i + step;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    const res = await reorderStrip(next.map((x) => x.id));
    if (!res.ok) {
      setError(res.error);
      await reload();
    } else flash("Order saved");
  }

  const shown = items.filter((x) => x.active).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Photo strip</h1>
        <Link href="/team" className="text-sm font-semibold text-brand">← Inbox</Link>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        The cards on the Shop Plug home screen, top to bottom = first to last. Each card reads: When • / What delivered to Where. {shown} showing. Changes appear within a minute.
        {shown < 2 && <strong className="text-amber-700"> Show at least 2 cards, or the backup set is used.</strong>}
      </p>

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="mt-3 rounded-xl bg-brand-tint p-3 text-sm text-brand-dark">✓ {saved}</p>}

      <ol className="mt-4 space-y-3">
        {items.map((it, i) => (
          <Row
            key={it.id}
            it={it}
            position={i + 1}
            imageSrc={src(it.image_url)}
            first={i === 0}
            last={i === items.length - 1}
            onMove={(step) => move(i, step)}
            onChanged={async (msg) => {
              setError(null);
              await reload();
              flash(msg);
            }}
            onError={setError}
          />
        ))}
      </ol>

      <AddCard
        onAdded={async () => {
          await reload();
          flash("Card added at the end. Move it up if you like.");
        }}
        onError={setError}
      />
    </main>
  );
}

function Row({
  it,
  position,
  imageSrc,
  first,
  last,
  onMove,
  onChanged,
  onError,
}: {
  it: StripItem;
  position: number;
  imageSrc: string;
  first: boolean;
  last: boolean;
  onMove: (step: -1 | 1) => void;
  onChanged: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [f, setF] = useState({ item: it.item, area: it.area, when_text: it.when_text, ask: it.ask });
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = f.item !== it.item || f.area !== it.area || f.when_text !== it.when_text || f.ask !== it.ask;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    setBusy(true);
    const res = await action();
    if (res.ok) onChanged(msg);
    else onError(res.error ?? "That didn't save.");
    setBusy(false);
  }

  return (
    <li className={`flex gap-3 rounded-2xl bg-white p-3 shadow-sm ${it.active ? "" : "opacity-55"}`}>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-bold text-gray-400">{position}</span>
        <button type="button" aria-label="Move up" disabled={first || busy} onClick={() => onMove(-1)} className="h-10 w-10 rounded-full border border-gray-200 disabled:opacity-30">
          ↑
        </button>
        <button type="button" aria-label="Move down" disabled={last || busy} onClick={() => onMove(1)} className="h-10 w-10 rounded-full border border-gray-200 disabled:opacity-30">
          ↓
        </button>
      </div>

      <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        {it.video_url && <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 text-[10px] font-semibold text-white">🎬 video</span>}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <input aria-label="What was delivered" value={f.item} maxLength={60} onChange={set("item")} className={input} />
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Delivered to (area)" list="strip-areas" value={f.area} maxLength={40} onChange={set("area")} className={input} placeholder="Area" />
          <input aria-label="When" list="strip-when" value={f.when_text} maxLength={40} onChange={set("when_text")} className={input} placeholder="When" />
        </div>
        <input aria-label="What a tap asks for" value={f.ask} maxLength={120} onChange={set("ask")} className={input} placeholder="Tap asks for… e.g. I want suya delivered, please" />
        <div className="flex flex-wrap gap-2 text-sm">
          {dirty && (
            <button type="button" disabled={busy} onClick={() => run(() => saveStripItem({ id: it.id, ...f }), "Card saved")} className="min-h-10 rounded-full bg-brand px-4 font-semibold text-white">
              Save
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => setStripActive(it.id, !it.active), it.active ? "Card hidden" : "Card showing")}
            className="min-h-10 rounded-full border border-gray-200 px-3 font-semibold"
          >
            {it.active ? "Hide" : "Show"}
          </button>
          {confirmDelete ? (
            <button type="button" disabled={busy} onClick={() => run(() => deleteStripItem(it.id), "Card deleted")} className="min-h-10 rounded-full bg-red-600 px-3 font-semibold text-white">
              Tap again to delete
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-10 rounded-full px-3 text-gray-500">
              Delete
            </button>
          )}
        </div>
      </div>

      <datalist id="strip-areas">
        {CALABAR_AREAS.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <datalist id="strip-when">
        {WHEN.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>
    </li>
  );
}

function AddCard({ onAdded, onError }: { onAdded: () => void; onError: (msg: string) => void }) {
  const [f, setF] = useState({ item: "", area: "", when_text: "", ask: "" });
  const [photo, setPhoto] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function pick(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const blob = await compressImage(file, 1200, 0.82);
      const target = await stripUploadTarget();
      if (!target.ok) throw new Error(target.error);
      const put = await fetch(target.uploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
      if (!put.ok) throw new Error("upload");
      setPhoto({ url: target.publicUrl, preview: URL.createObjectURL(blob) });
    } catch (e) {
      onError(e instanceof Error && e.message !== "upload" ? e.message : "The photo didn't upload. Please try again.");
    }
    setUploading(false);
  }

  async function add() {
    if (!photo) return onError("Add a photo first.");
    setBusy(true);
    const res = await saveStripItem({ ...f, image_url: photo.url });
    if (res.ok) {
      setF({ item: "", area: "", when_text: "", ask: "" });
      setPhoto(null);
      onAdded();
    } else onError(res.error);
    setBusy(false);
  }

  return (
    <section className="mt-6 space-y-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-4">
      <h2 className="font-semibold">Add a delivery</h2>
      <div className="flex gap-3">
        <label className="flex h-32 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-center text-xs text-gray-500">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.preview} alt="" className="h-full w-full object-cover" />
          ) : uploading ? (
            "Uploading…"
          ) : (
            "＋ Photo"
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <div className="min-w-0 flex-1 space-y-2">
          <input aria-label="What was delivered" placeholder="What was delivered, e.g. 5k suya" value={f.item} maxLength={60} onChange={set("item")} className={input} />
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Delivered to (area)" list="strip-areas" placeholder="Area, e.g. Marian" value={f.area} maxLength={40} onChange={set("area")} className={input} />
            <input aria-label="When" list="strip-when" placeholder="When, e.g. Last night" value={f.when_text} maxLength={40} onChange={set("when_text")} className={input} />
          </div>
          <input aria-label="What a tap asks for" placeholder="Tap asks for… (optional)" value={f.ask} maxLength={120} onChange={set("ask")} className={input} />
        </div>
      </div>
      <button type="button" disabled={busy || uploading || !photo || !f.item.trim()} onClick={add} className="min-h-11 w-full rounded-full bg-brand font-semibold text-white disabled:opacity-50">
        Add to the strip
      </button>
      <p className="text-xs text-gray-500">Photos only here. For a video, send it to the developer and it will be added for you.</p>
    </section>
  );
}
