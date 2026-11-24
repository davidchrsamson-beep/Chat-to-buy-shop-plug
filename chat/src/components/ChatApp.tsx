"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BRAND } from "@chat/lib/brand";
import { isChristmasEdition } from "@chat/lib/season";
import DeliveredCarousel, { type Delivery } from "./DeliveredCarousel";
import { ChristmasBadge, FestiveBackdrop } from "./Festive";
import PlugFace from "./PlugFace";
import RequestChat, { savedRequestCode } from "./RequestChat";
import ShopPlugMark from "./ShopPlugMark";
import { THEME_STYLES, ThemeToggle, useTheme } from "./Theme";
import TypingDemo from "./TypingDemo";

const CHRISTMAS = isChristmasEdition();

// Shop Plug: the home screen, and the request chat it opens.
// (The earlier "errand" vendor search is kept in the code but no longer shown.)
export default function ChatApp({ deliveries }: { deliveries?: Delivery[] }) {
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
            <Link href="/" aria-label={`${BRAND} home`} className="flex shrink-0 items-center gap-2">
              <ShopPlugMark size={30} />
              <span className="text-lg font-bold tracking-tight">{BRAND}</span>
            </Link>
            <nav aria-label="Main navigation" className="flex items-center gap-2">
              <a href="/find-a-plug" className="whitespace-nowrap text-xs font-semibold text-snow hover:text-accent sm:text-sm">
                Find a Plug
              </a>
              <Link href="/vendor/signup" className="whitespace-nowrap rounded-full bg-accent px-3 py-2 text-xs font-semibold text-night sm:text-sm">
                <span className="sm:hidden">Sell</span>
                <span className="hidden sm:inline">Sell on Shop Plug</span>
              </Link>
              <ThemeToggle theme={theme} onToggle={toggle} />
            </nav>
          </header>

          {/* Right under the logo: someone "typing" an order, then the offer */}
          <section className="mt-3 min-w-0">
            <h1 className="sr-only">Shop Plug: order anything you want, day or late night.</h1>
            <p className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-mute">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
              Plugs are always active
            </p>
            <TypingDemo onOpen={() => openChat()} />
            <p className="mt-3 px-2 text-center text-sm leading-snug">
              Pay the plug&apos;s transportation, from <strong className="text-accent">₦600</strong>. Get your requests delivered at your
              convenience.
            </p>
          </section>

          <main className="flex min-w-0 flex-1 flex-col justify-end pb-5 pt-4">
            <DeliveredCarousel items={deliveries} onAsk={(text) => openChat(text)} />
          </main>

          <button
            type="button"
            onClick={() => openChat()}
            className="flex min-h-16 w-full items-center gap-3 rounded-full bg-accent py-2 pl-2 pr-6 text-left text-night shadow-lg shadow-accent/25 transition active:scale-[.99]"
          >
            <span className="rounded-[14px] ring-2 ring-white/70">
              <PlugFace size={46} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold leading-tight">{openCode ? "Continue your request" : "Make a request"}</span>
              <span className="block truncate text-xs font-medium opacity-80">
                {openCode ? `Request ${openCode}` : "Tell your plug what you need"}
              </span>
            </span>
            <span aria-hidden="true" className="text-2xl font-bold">→</span>
          </button>
        </div>
      )}
    </>
  );
}
