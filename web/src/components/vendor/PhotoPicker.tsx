"use client";

import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { createUploadTargets, type UploadPurpose } from "@/app/vendor/uploads";
import { compressImage } from "@/lib/images";

export type Photo = { id: string; url: string | null; preview: string; status: "uploading" | "ready" | "error" };

export function photosFromUrls(urls: string[]): Photo[] {
  return urls.map((url, i) => ({ id: `saved-${i}-${url}`, url, preview: url, status: "ready" }));
}

type Props = {
  label: string;
  photos: Photo[];
  setPhotos: Dispatch<SetStateAction<Photo[]>>;
  max: number;
  purpose: UploadPurpose;
  hint?: ReactNode;
};

// Pick several photos at once. Each is shrunk on the phone, then uploaded straight to R2.
// The first photo is the cover; arrows change the order.
export default function PhotoPicker({ label, photos, setPhotos, max, purpose, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const remaining = max - photos.length;

  const update = (id: string, patch: Partial<Photo>) =>
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  async function addFiles(fileList: FileList) {
    setNotice(null);
    const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const files = images.slice(0, remaining);
    if (images.length > files.length) setNotice(`Only ${max} photos allowed, so we added the first ${files.length}.`);
    if (files.length === 0) return;

    const entries: Photo[] = files.map((f) => ({
      id: crypto.randomUUID(),
      url: null,
      preview: URL.createObjectURL(f),
      status: "uploading",
    }));
    setPhotos((list) => [...list, ...entries]);

    const res = await createUploadTargets(files.length, purpose);
    if (!res.ok) {
      entries.forEach((e) => update(e.id, { status: "error" }));
      setNotice(res.error);
      return;
    }

    await Promise.all(
      files.map(async (file, i) => {
        const entry = entries[i];
        try {
          const blob = await compressImage(file);
          const put = await fetch(res.targets[i].uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: blob,
          });
          if (!put.ok) throw new Error(`Upload failed (${put.status})`);
          update(entry.id, { url: res.targets[i].publicUrl, status: "ready" });
        } catch {
          update(entry.id, { status: "error" });
          setNotice("Some photos didn't upload. Remove them and try again.");
        }
      }),
    );
  }

  function remove(id: string) {
    setPhotos((list) => list.filter((p) => p.id !== id));
  }

  function move(index: number, step: number) {
    setPhotos((list) => {
      const next = [...list];
      const target = index + step;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs text-gray-400">{photos.length}/{max}</span>
      </div>

      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => (
          <li key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.preview}
              alt={`Photo ${i + 1}`}
              className={`h-full w-full object-cover ${p.status === "uploading" ? "opacity-50" : ""}`}
            />
            {i === 0 && max > 1 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-semibold text-white">
                Cover
              </span>
            )}
            {p.status === "uploading" && (
              <span className="absolute inset-x-0 bottom-0 bg-white/85 py-1 text-center text-[11px] text-gray-700">Uploading…</span>
            )}
            {p.status === "error" && (
              <span className="absolute inset-x-0 bottom-0 bg-red-50 py-1 text-center text-[11px] text-red-700">Didn&apos;t upload</span>
            )}
            <div className="absolute right-1 top-1">
              <SmallButton label={`Remove photo ${i + 1}`} onClick={() => remove(p.id)}>✕</SmallButton>
            </div>
            {photos.length > 1 && p.status !== "uploading" && (
              <div className="absolute bottom-1 left-1 flex gap-1">
                {i > 0 && <SmallButton label={`Move photo ${i + 1} earlier`} onClick={() => move(i, -1)}>‹</SmallButton>}
                {i < photos.length - 1 && <SmallButton label={`Move photo ${i + 1} later`} onClick={() => move(i, 1)}>›</SmallButton>}
              </div>
            )}
          </li>
        ))}

        {remaining > 0 && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-brand hover:text-brand"
            >
              <span aria-hidden="true" className="text-2xl leading-none">+</span>
              Add photos
            </button>
          </li>
        )}
      </ul>

      {notice && <p role="alert" className="mt-2 text-xs text-red-600">{notice}</p>}
      {hint && <div className="mt-2 text-xs">{hint}</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function SmallButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-ink shadow"
    >
      {children}
    </button>
  );
}
