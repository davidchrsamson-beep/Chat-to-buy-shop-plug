"use client";

import { useEffect, useState } from "react";

// While errand searches: three shimmering card shapes, and a line that says
// what it's checking right now (it changes every second or so).
export default function Searching({ area, tonight, delivered }: { area?: string; tonight?: boolean; delivered?: boolean }) {
  const steps = [
    "Reading your request…",
    tonight ? "Checking who's open tonight…" : "Checking which stores are open…",
    area ? `Finding who delivers to ${area}…` : delivered ? "Finding stores that deliver…" : "Looking through Calabar stores…",
    "Comparing prices fairly…",
    "Almost there…",
  ];
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 1100);
    return () => clearInterval(t);
  }, [steps.length]);

  return (
    <div className="flex flex-col gap-3" role="status" aria-live="polite">
      <p className="flex items-center gap-2 px-4 text-sm text-mute">
        <span className="errand-orbit relative inline-block h-4 w-4" aria-hidden="true">
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent" />
        </span>
        <span key={i} className="errand-step">{steps[i]}</span>
      </p>

      <div className="flex gap-2.5 overflow-hidden px-4" aria-hidden="true">
        {[0, 1, 2].map((n) => (
          <div key={n} className="w-56 shrink-0 overflow-hidden rounded-[22px] border border-line bg-panel">
            <div className="errand-shimmer h-40" style={{ animationDelay: `${n * 0.15}s` }} />
            <div className="space-y-2 p-3">
              <div className="errand-shimmer h-4 w-20 rounded-full" style={{ animationDelay: `${n * 0.15}s` }} />
              <div className="errand-shimmer h-3 w-36 rounded-full" style={{ animationDelay: `${n * 0.15 + 0.1}s` }} />
              <div className="errand-shimmer h-3 w-28 rounded-full" style={{ animationDelay: `${n * 0.15 + 0.2}s` }} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes errand-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes errand-orbit { to { transform: rotate(360deg); } }
        @keyframes errand-step { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .errand-shimmer {
          background: linear-gradient(90deg, #26272c 0%, #34353b 20%, #4a3a2e 30%, #34353b 40%, #26272c 60%);
          background-size: 200% 100%;
          animation: errand-shimmer 1.6s linear infinite;
        }
        .errand-orbit { animation: errand-orbit 1s linear infinite; }
        .errand-step { animation: errand-step .35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .errand-shimmer, .errand-orbit, .errand-step { animation: none; }
        }
      `}</style>
    </div>
  );
}
