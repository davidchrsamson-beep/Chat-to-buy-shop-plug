"use client";

import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { THEME_STYLES, useTheme } from "./Theme";

// Simple reading layout for the Privacy and Terms pages (same white/black look as the app).
export default function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  useTheme(); // applies the visitor's saved white/black choice
  return (
    <>
      <style>{THEME_STYLES}</style>
      <main className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 text-[15px] leading-relaxed">
        <a href="/" className="text-sm font-semibold text-accent">‹ {BRAND}</a>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-xs text-mute">Last updated {updated}</p>
        <div className="mt-6 space-y-5 [&_h2]:text-base [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">{children}</div>
      </main>
    </>
  );
}
