"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { isChristmasEdition } from "@/lib/season";
import ExampleCarousel from "./ExampleCarousel";
import { ChristmasBadge, FestiveBackdrop } from "./Festive";
import PlugFace from "./PlugFace";
import RequestChat, { savedRequestCode } from "./RequestChat";
import { THEME_STYLES, ThemeToggle, useTheme } from "./Theme";

const CHRISTMAS = isChristmasEdition();

// Shor plug: the home screen, and the request chat it opens.
// (The earlier "errand" vendor search is kept in the code but no longer shown.)
export default function ChatApp() {
  const { theme, toggle } = useTheme();
  const [chat, setChat] = useState<{ open: boolean; text: string }>({ open: false, text: "" });
  const [openCode, setOpenCode] = useState<string | null>(null);

  useEffect(() => {
    setOpenCode(savedRequestCode());
  }, [chat.open]);

  // The phone's back button closes the chat instead of leaving the site.
  useEffect(() => {
    const onBack = () => setChat({ open: false, text: "" });
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  function openChat(text = "") {
    try {
      window.history.pushState({ shorplugChat: true }, "");
    } catch {}
    setChat({ open: true, text });
  }

  function closeChat() {
    if (window.history.state?.shorplugChat) window.history.back();
    else setChat({ open: false, text: "" });
  }

  return (
    <>
      <style>{THEME_STYLES}</style>
      {CHRISTMAS && !chat.open && <FestiveBackdrop />}

      {chat.open ? (
        <RequestChat initialText={chat.text} onBack={closeChat} theme={theme} onToggleTheme={toggle} />
      ) : (
        <div className="relative z-10 mx-auto flex min-h-dvh w-full min-w-0 max-w-xl flex-col px-4 pb-6 pt-4">
          {CHRISTMAS && (
            <div className="mb-1 flex justify-center">
              <ChristmasBadge />
            </div>
          )}
          <header className="flex h-11 items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <PlugFace size={30} />
              <span className="text-lg font-bold tracking-tight">{BRAND}</span>
            </span>
            <ThemeToggle theme={theme} onToggle={toggle} />
          </header>

          <main className="flex min-w-0 flex-1 flex-col justify-end gap-6 pb-5">
            <div className="px-1">
              <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight">
                Order anything you want, day or <span className="text-accent">late night</span>.
              </h1>
              <p className="mt-3 text-base leading-relaxed text-mute">Plugs are always active.</p>
            </div>

            <ExampleCarousel onAsk={(text) => openChat(text)} />
          </main>

          <button
            type="button"
            onClick={() => openChat()}
            className="flex min-h-16 w-full items-center gap-3 rounded-full bg-accent py-2 pl-2 pr-6 text-left text-night shadow-lg shadow-accent/25 transition active:scale-[.99]"
          >
            <span className="rounded-full bg-night/20 p-0.5">
              <PlugFace size={44} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold leading-tight">{openCode ? "Continue your request" : "Make a request"}</span>
              <span className="block truncate text-xs font-medium opacity-80">
                {openCode ? `Request ${openCode}` : "Tell your plug what you need"}
              </span>
            </span>
            <span aria-hidden="true" className="text-2xl font-bold">→</span>
          </button>
          <p className="mt-3 text-center text-xs text-mute">Pay by bank transfer · Your plug calls you on delivery</p>
        </div>
      )}
    </>
  );
}
