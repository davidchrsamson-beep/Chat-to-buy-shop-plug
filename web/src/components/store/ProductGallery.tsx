"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Product photos: a big main photo, small boxes for every other angle underneath.
// Tap a small box to switch the main photo; tap the main photo to open it full screen,
// where buyers can flip through every angle.
export default function ProductGallery({ photos, name }: { photos: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const count = photos.length;

  const go = (step: number) => setCurrent((i) => (i + step + count) % count);

  // Full-screen view: arrow keys flip photos, Escape closes, and the page behind stops scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setCurrent((i) => (i + 1) % count);
      if (e.key === "ArrowLeft") setCurrent((i) => (i - 1 + count) % count);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, count]);

  if (count === 0) return <div className="aspect-[4/5] w-full bg-gray-100 sm:rounded-2xl" />;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${name}, photo ${current + 1} of ${count}, full screen`}
        className="relative block w-full cursor-zoom-in overflow-hidden bg-gray-100 sm:rounded-2xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[current]} alt={`${name}, photo ${current + 1} of ${count}`} className="aspect-[4/5] w-full object-cover" />
        {count > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {current + 1} / {count}
          </span>
        )}
      </button>

      {count > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto px-5 pb-1 sm:px-0" aria-label="All photos">
          {photos.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === current ? "true" : undefined}
                className={`block h-16 w-16 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-20 ${
                  i === current ? "border-brand" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Drawn at the very top of the page (a "portal"), so the store's header can never cover the ✕. */}
      {open &&
        createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photos`}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm">{current + 1} / {count}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close photos"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25"
            >
              ✕
            </button>
          </div>
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-6"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)} // tap the dark area to close
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[current]} alt={`${name}, photo ${current + 1} of ${count}`} className="max-h-full max-w-full object-contain" />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
                >
                  ›
                </button>
              </>
            )}
          </div>
          <p className="pb-4 text-center text-xs text-white/50">Tap outside the photo or ✕ to close</p>
        </div>,
          document.body,
        )}
    </div>
  );
}
