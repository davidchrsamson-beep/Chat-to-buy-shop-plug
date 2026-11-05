"use client";

import { useEffect, useRef, useState } from "react";

// Orders Shor plug has delivered (photos and short videos used with permission).
// Exactly two show at a time, and the strip moves along by one every few seconds
// (it pauses while touched; swipe to move it yourself). Tapping a card starts a request
// for something similar.
//
// To add or change a delivery: put the photo (or a short .mp4 plus a .jpg cover)
// in chat/public/delivered/ and add a line below.
type Delivery = {
  item: string; // what was delivered
  area: string; // where to
  when: string; // when, in past tense
  image: string; // photo, or the cover picture of a video
  video?: string; // short silent clip (optional)
  ask: string; // what a tap types into the chat
};

const DELIVERIES: Delivery[] = [
  { item: "Human hair bundle", area: "Marian", when: "earlier this morning", image: "/delivered/hair.jpg", ask: "I need human hair delivered, please" },
  { item: "Suya, hot off the grill", area: "Atimbo", when: "yesterday night", image: "/delivered/suya-day.jpg", video: "/delivered/suya-day.mp4", ask: "I want suya delivered, please" },
  { item: "Fresh yoghurt", area: "Parliamentary", when: "earlier this morning", image: "/delivered/yoghurt.jpg", ask: "I need fresh yoghurt delivered, please" },
  { item: "Crates of eggs", area: "Atekong", when: "yesterday", image: "/delivered/eggs.jpg", ask: "I need crates of eggs delivered, please" },
  { item: "Perfumes & body splash", area: "Satellite Town", when: "yesterday evening", image: "/delivered/perfume-bag.jpg", ask: "I need perfume delivered, please" },
  { item: "Suya & sausage", area: "State Housing", when: "last night", image: "/delivered/suya-night.jpg", video: "/delivered/suya-night.mp4", ask: "I want suya delivered tonight, please" },
];
const N = DELIVERIES.length;
const LOOP = [...DELIVERIES, ...DELIVERIES.slice(0, 2)]; // the first two again at the end, for a seamless loop

export default function DeliveredCarousel({ onAsk }: { onAsk: (text: string) => void }) {
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

  // Move along by one every 3.5 seconds.
  useEffect(() => {
    if (paused || still) return;
    const t = setInterval(() => {
      setAnimate(true);
      setIndex((i) => i + 1);
    }, 3500);
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
      <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold text-mute">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
        Recently delivered by our plugs
      </p>
      <div className="overflow-hidden" aria-roledescription="carousel" aria-label="Recent deliveries">
        <div
          className="flex"
          style={{
            transform: `translateX(-${index * 50}%)`,
            transition: animate && !still ? "transform 600ms cubic-bezier(.22,.8,.25,1)" : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {LOOP.map((d, i) => (
            <div key={i} className="w-1/2 shrink-0 px-1" aria-hidden={i >= N ? true : undefined}>
              <button
                type="button"
                tabIndex={i >= N ? -1 : 0}
                onClick={() => onAsk(d.ask)}
                aria-label={`${d.item}, delivered to ${d.area} ${d.when}. Tap to request something similar.`}
                className="block w-full overflow-hidden rounded-[20px] border border-line bg-panel text-left transition hover:border-line-strong"
              >
                <div className="relative aspect-[4/5] w-full bg-[var(--placeholder)]">
                  {d.video ? (
                    <video
                      src={d.video}
                      poster={d.image}
                      muted
                      loop
                      autoPlay={!still}
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.image} alt="" loading={i < 2 ? "eager" : "lazy"} draggable={false} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-[var(--ok)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    ✓ Delivered
                  </span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="truncate text-[13px] font-bold">{d.item}</p>
                  <p className="truncate text-xs">
                    <span className="text-mute">Delivered to</span> <span className="font-semibold">{d.area}</span>
                  </p>
                  <p className="truncate text-xs text-mute">{d.when}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dots: where the strip is, and tap to jump */}
      <div className="mt-2.5 flex justify-center gap-1.5">
        {DELIVERIES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show delivery ${i + 1}`}
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
