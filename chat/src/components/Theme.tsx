"use client";

import { useEffect, useState } from "react";

// errand's two looks: WHITE (the default) and BLACK (the original night look).
// The buyer switches with the sun/moon button; the choice is remembered on that phone or laptop.
//
// How it works: every errand colour (background "night", text "snow", cards "panel", lines,
// grey text "mute") is a named colour. White mode simply swaps those names to light colours,
// so every screen follows without changing each part of the page.

export const THEME_STYLES = `
/* Phones: the page must never slide sideways (wide decorations are trimmed at the screen edge). */
html, body { max-width: 100%; overflow-x: hidden; overflow-x: clip; overscroll-behavior-x: none; }

/* Colours used in both looks */
:root {
  --ok: #4ADE80;          /* "Open now" green */
  --badge: #FFC94A;       /* Christmas Edition gold */
  --placeholder: #2A2B31; /* photo boxes before a photo loads */
  --shimmer-a: #26272c; --shimmer-b: #34353b; --shimmer-c: #4a3a2e;
}

/* WHITE: the default (anything not set to dark) */
html:not([data-theme="dark"]) {
  --color-night: #FFFFFF;
  --color-snow: #16171C;
  --color-panel: #F5F5F7;
  --color-line: #E7E7EB;
  --color-line-strong: #D3D3DA;
  --color-mute: #6A6B74;
  --ok: #16A34A;
  --badge: #B45309;
  --placeholder: #ECECEF;
  --shimmer-a: #EEEEF1; --shimmer-b: #F7F7F9; --shimmer-c: #FCE9DA;
  color-scheme: light;
}
html:not([data-theme="dark"]) body { background: #FFFFFF; color: #16171C; }

html[data-theme="dark"] { color-scheme: dark; }
`;

const KEY = "errand-theme";

// The page itself starts in white; this applies a saved "black" choice as soon as the page opens.
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const t = saved === "dark" ? "dark" : "light";
    setTheme(t);
    document.documentElement.dataset.theme = t;
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }

  return { theme, toggle };
}

export function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? "Switch to white background" : "Switch to black background"}
      title={dark ? "White background" : "Black background"}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-mute transition hover:text-snow"
    >
      {dark ? (
        // Sun: go white
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon: go black
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
