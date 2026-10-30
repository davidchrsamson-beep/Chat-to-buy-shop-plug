"use client";

import { useEffect, useRef, useState } from "react";
import { IconImage } from "./Icons";

// Real-photo examples of what errand is for. Exactly two show at a time, and the strip
// moves along by one every few seconds (it pauses while touched; swipe to move it yourself).
// Tapping a card asks errand for that thing.
type Slide = { image?: string; ask: string; tag: string; photo?: boolean };

const SLIDES: Slide[] = [
  { image: "/examples/baileys.jpg", ask: "Baileys delivered to Marian by 1am", tag: "🛵 Marian · by 1am" },
  { image: "/examples/yogurt-starter.jpg", ask: "Yogurt culture around Atekong", tag: "🛵 Atekong · today" },
  { image: "/examples/greek-yogurt.jpg", ask: "Greek yogurt delivered to State Housing tonight", tag: "🛵 State Housing · tonight" },
  { image: "/examples/gift-box.jpg", ask: "Gift box for my babe under ₦20k", tag: "🎁 Under ₦20k" },
  { ask: "Find this from a photo", tag: "📷 Snap & search", photo: true },
];
const N = SLIDES.length;
const LOOP = [...SLIDES, ...SLIDES.slice(0, 2)]; // the first two again at the end, for a seamless loop

export default function ExampleCarousel({ onAsk, onPhoto }: { onAsk: (text: string) => void; onPhoto: () => void }) {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false); // "reduce motion" on the phone: no auto-moving
  const startX = useRef<number | null>(null);

  useEffect(() => {
    try {
      setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch {}
  }, []);

  // Move along by one every 3 seconds.
  useEffect(() => {
    if (paused || still) return;
    const t = setInterval(() => {
      setAnimate(true);
      setIndex((i) => i + 1);
    }, 3000);
    return () => clearInterval(t);
  }, [paused, still]);

  // After sliding onto the repeated copies at the end, jump back to the start invisibly.
  function onTransitionEnd() {
    if (index >= N) {
      setAnimate(false);
      setIndex(index - N);
    }
  }

  function go(step: number) {
    setAnimate(true);
    setIndex((i) => (i + step + N) % N);
  }

  return (
    <div
      className="w-full min-w-0"
      onPointerDown={(e) => {
        startX.current = e.clientX;
        setPaused(true);
      }}
      onPointerUp={(e) => {
        if (startX.current !== null) {
          const dx = e.clientX - startX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }
        startX.current = null;
        setTimeout(() => setPaused(false), 4000);
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="mb-2 px-1 text-xs text-mute">Tap one to try it</p>
      <div className="overflow-hidden" aria-roledescription="carousel" aria-label="Examples of what you can ask">
        <div
          className="flex"
          style={{
            transform: `translateX(-${index * 50}%)`,
            transition: animate && !still ? "transform 600ms cubic-bezier(.22,.8,.25,1)" : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {LOOP.map((s, i) => (
            <div key={i} className="w-1/2 shrink-0 px-1" aria-hidden={i >= N ? true : undefined}>
              <button
                type="button"
                tabIndex={i >= N ? -1 : 0}
                onClick={() => (s.photo ? onPhoto() : onAsk(s.ask))}
                className="block w-full overflow-hidden rounded-[20px] border border-line bg-panel text-left transition hover:border-line-strong"
              >
                <div className="relative aspect-[4/5] w-full bg-[#2A2B31]">
                  {s.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image} alt="" loading={i < 2 ? "eager" : "lazy"} draggable={false} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-accent">
                      <span className="scale-[2.2]"><IconImage /></span>
                    </div>
                  )}
                  {/* The request, written on the product */}
                  <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-night/80 px-2.5 py-1 text-[11px] font-semibold text-snow backdrop-blur">
                    {s.tag}
                  </span>
                </div>
                <p className="line-clamp-2 min-h-[2.6em] px-3 py-2.5 text-[13px] leading-snug">{s.ask}</p>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dots: where the strip is, and tap to jump */}
      <div className="mt-2.5 flex justify-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show example ${i + 1}`}
            onClick={() => {
              setAnimate(true);
              setIndex(i);
            }}
            className="flex h-6 w-6 items-center justify-center"
          >
            <span className={`block h-1.5 rounded-full transition-all ${index % N === i ? "w-4 bg-accent" : "w-1.5 bg-line-strong"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
