"use client";

import { useEffect, useState } from "react";
import type { Find } from "@/app/actions";

// "● Just found: Baileys Irish Cream 1L · Marian · 3 min ago", changing every few seconds.
// Tap it to search for that item. Shows nothing until there are at least 2 real finds,
// so the feed is never faked.
export default function JustFound({ finds, onPick }: { finds: Find[]; onPick: (name: string) => void }) {
  const [i, setI] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (finds.length < 2) return;
    const t = setInterval(() => {
      setI((n) => (n + 1) % finds.length);
      setNow(Date.now());
    }, 3500);
    return () => clearInterval(t);
  }, [finds.length]);

  if (finds.length < 2) return null;
  const f = finds[i % finds.length];

  return (
    <button
      type="button"
      onClick={() => onPick(f.productName)}
      aria-label={`Just found ${f.productName}${f.area ? ` in ${f.area}` : ""}. Tap to search for it.`}
      className="flex w-full min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-full border border-line bg-panel/80 px-3.5 py-2.5 text-left backdrop-blur transition hover:border-line-strong"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="errand-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80]" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ADE80]" />
      </span>
      <span className="shrink-0 text-xs font-semibold text-[#4ADE80]">Just found</span>
      <span key={f.productId} className="errand-fade-in min-w-0 flex-1 truncate text-[13px]">
        {f.productName}
        <span className="text-mute">
          {f.area ? ` · ${f.area}` : ""} · {ago(f.foundAt, now)}
        </span>
      </span>
      <style>{`
        @keyframes errand-ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes errand-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .errand-ping { animation: errand-ping 1.6s cubic-bezier(0,0,.2,1) infinite; opacity: .6; }
        .errand-fade-in { animation: errand-fade-in .45s ease-out; }
        @media (prefers-reduced-motion: reduce) { .errand-ping, .errand-fade-in { animation: none; } }
      `}</style>
    </button>
  );
}

function ago(iso: string, now: number) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return `${h} hr${h === 1 ? "" : "s"} ago`;
}
