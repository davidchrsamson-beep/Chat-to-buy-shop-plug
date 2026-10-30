"use client";

import type { SearchPrefs } from "@/app/actions";
import { CALABAR_AREAS } from "@/lib/areas";

// Tap-able extras above the message box. They add to whatever the buyer types:
// "Tonight" (open tonight), "Delivered" (stores that deliver), "Near me" (pick your area once).
export default function QuickChips({ prefs, onChange }: { prefs: SearchPrefs; onChange: (p: SearchPrefs) => void }) {
  const on = "border-accent bg-accent/15 text-accent";
  const off = "border-line-strong text-mute hover:text-snow";
  const chip = "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition";

  return (
    <div role="group" aria-label="Quick options" className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
      <button
        type="button"
        aria-pressed={Boolean(prefs.tonight)}
        onClick={() => onChange({ ...prefs, tonight: !prefs.tonight })}
        className={`${chip} ${prefs.tonight ? on : off}`}
      >
        🌙 Tonight
      </button>
      <button
        type="button"
        aria-pressed={Boolean(prefs.delivered)}
        onClick={() => onChange({ ...prefs, delivered: !prefs.delivered })}
        className={`${chip} ${prefs.delivered ? on : off}`}
      >
        🛵 Delivered
      </button>

      {prefs.area ? (
        <button
          type="button"
          onClick={() => onChange({ ...prefs, area: "" })}
          aria-label={`Near ${prefs.area}. Tap to clear.`}
          className={`${chip} ${on}`}
        >
          📍 {prefs.area} <span aria-hidden="true">✕</span>
        </button>
      ) : (
        // A real dropdown dressed as a chip: on phones it opens the native picker.
        <label className={`${chip} ${off} relative cursor-pointer`}>
          📍 Near me
          <select
            aria-label="Choose your area"
            value=""
            onChange={(e) => e.target.value && onChange({ ...prefs, area: e.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">Choose your area…</option>
            {CALABAR_AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
