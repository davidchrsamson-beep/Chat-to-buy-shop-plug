"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { logHandoff, recentFinds, searchVendors, type Find, type SearchPrefs, type VendorResult } from "@chat/app/actions";
import { normaliseArea } from "@chat/lib/areas";
import { BRAND } from "@chat/lib/brand";
import { EXPERIMENTS } from "@chat/lib/experiments";
import { formatNaira } from "@chat/lib/format";
import { shrinkPhoto } from "@chat/lib/photo";
import { formatPrice } from "@chat/lib/price";
import Composer from "./Composer";
import { ChristmasBadge, FestiveBackdrop } from "./Festive";
import JustFound from "./JustFound";
import QuickChips from "./QuickChips";
import Searching from "./Searching";
import { isChristmasEdition } from "@chat/lib/season";
import ResultCard from "./ResultCard";
import { THEME_STYLES } from "./Theme";
import { IconPerson, IconPlus } from "./Icons";
import { HomepageDiscovery } from "./HomepageDiscovery";
import type { HomepageStore, HomepageDelivery } from "@/lib/homepage";

const TEAM_WHATSAPP = (process.env.NEXT_PUBLIC_TEAM_WHATSAPP ?? "").replace(/\D/g, "");
const MARKET_URL = "";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const CHRISTMAS = isChristmasEdition();

// Phones: the page must never slide sideways (wide decorations are trimmed at the screen edge).
const NO_SIDEWAYS = (
  <style>{`html, body { max-width: 100%; overflow-x: hidden; overflow-x: clip; overscroll-behavior-x: none; }`}</style>
);

type SortKey = "best" | "low" | "high" | "new";
type UserMsg = { id: string; role: "user"; text: string; imageUrl?: string; tags?: string };
type ResultsMsg = {
  id: string;
  role: "errand";
  kind: "results";
  request: string;
  reply: string;
  results: VendorResult[];
  budgetKobo: number | null;
  shown: number;
  sort: SortKey;
  openVendor: string | null;
};
type NoteMsg = { id: string; role: "errand"; kind: "note"; text: string; request: string };
type QuestionMsg = { id: string; role: "errand"; kind: "question"; text: string; options: string[]; request: string };
type Msg = UserMsg | ResultsMsg | NoteMsg | QuestionMsg;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Best match" },
  { key: "low", label: "Lowest price" },
  { key: "high", label: "Highest price" },
  { key: "new", label: "Newest" },
];



// "Ask for price" products have no price: they go last when sorting by price.
const low = (r: VendorResult) => r.priceKobo ?? Number.POSITIVE_INFINITY;
const high = (r: VendorResult) => r.priceKobo ?? Number.NEGATIVE_INFINITY;

function sortResults(list: VendorResult[], sort: SortKey) {
  const copy = [...list];
  if (sort === "low") copy.sort((a, b) => low(a) - low(b));
  else if (sort === "high") copy.sort((a, b) => high(b) - high(a));
  else if (sort === "new") copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else copy.sort((a, b) => a.rank - b.rank); // errand's fair order
  return copy;
}

export default function ErrandApp({ homepage }: { homepage: { stores: HomepageStore[]; deliveries: HomepageDelivery[] } }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prefs, setPrefsState] = useState<SearchPrefs>({});
  const [finds, setFinds] = useState<Find[]>([]);

  // Remember the buyer's area on this phone (just a convenience; fine if it's not available).
  useEffect(() => {
    let saved = "";
    try {
      saved = normaliseArea(localStorage.getItem("errand-area") ?? "");
    } catch {}
    if (!saved) return;
    const timer = window.setTimeout(() => setPrefsState((p) => ({ ...p, area: saved })), 0);
    return () => window.clearTimeout(timer);
  }, []);
  function setPrefs(next: SearchPrefs) {
    setPrefsState(next);
    try {
      if (next.area) localStorage.setItem("errand-area", next.area);
      else localStorage.removeItem("errand-area");
    } catch {}
  }

  // "Just found" feed: load now, then refresh every minute.
  useEffect(() => {
    if (!EXPERIMENTS.justFound) return;
    const load = () => void recentFinds().then(setFinds).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const counter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const nextId = () => String(++counter.current);
  const add = (msg: Msg) => setMessages((m) => [...m, msg]);
  const lastErrandId = [...messages].reverse().find((m) => m.role === "errand")?.id;

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  function runSearch(
    request: string,
    opts: { budgetOverrideKobo?: number | null; asked?: boolean; photoFile?: File | null } = {},
  ) {
    startTransition(async () => {
      let photo: string | null = null;
      if (opts.photoFile) {
        try {
          photo = await shrinkPhoto(opts.photoFile);
        } catch {
          add({ id: nextId(), role: "errand", kind: "note", request: request || "Item from my photo", text: "I couldn't open that photo. Try another one, or describe it in a few words." });
          return;
        }
      }

      const res = await searchVendors({
        text: request,
        budgetOverrideKobo: opts.budgetOverrideKobo ?? null,
        asked: opts.asked ?? false,
        photo,
        prefs: EXPERIMENTS.quickChips ? prefs : undefined,
      });
      if (!res.ok) {
        add({ id: nextId(), role: "errand", kind: "note", text: res.error, request: request || "Item from my photo" });
      } else if (res.kind === "question") {
        add({ id: nextId(), role: "errand", kind: "question", text: res.question, options: res.options, request: res.request });
      } else if (res.results.length === 0) {
        add({
          id: nextId(),
          role: "errand",
          kind: "note",
          request: res.request,
          text: opts.budgetOverrideKobo
            ? "Nothing cheaper in Shop Plug stores right now. Want a real person to hunt for a better deal?"
            : "I couldn't find that in Shop Plug stores yet. Our team can hunt it down for you.",
        });
      } else {
        add({
          id: nextId(),
          role: "errand",
          kind: "results",
          request: res.request,
          reply: res.reply,
          results: res.results,
          budgetKobo: res.budgetKobo,
          shown: 3,
          sort: "best",
          openVendor: null,
        });
        if (EXPERIMENTS.justFound) void recentFinds().then(setFinds).catch(() => {}); // the feed picks up this find
      }
    });
  }

  function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (isPending || (!text && !image)) return;

    const photoFile = image ? imageFile : null;
    const tags = EXPERIMENTS.quickChips
      ? [prefs.tonight && "🌙 Tonight", prefs.delivered && "🛵 Delivered", prefs.area && `📍 ${prefs.area}`].filter(Boolean).join(" · ")
      : "";
    add({ id: nextId(), role: "user", text, imageUrl: image ?? undefined, tags: tags || undefined });
    setInput("");
    setImage(null);
    setImageFile(null);
    setNotice(null);

    // If errand just asked a question, this message is the answer: search with both together.
    const last = [...messages].reverse().find((m) => m.role === "errand");
    if (last && last.kind === "question" && text && !photoFile) {
      runSearch(`${last.request}, ${text}`, { asked: true });
      return;
    }
    runSearch(text, { photoFile });
  }

  function answer(m: QuestionMsg, option: string) {
    if (isPending) return;
    add({ id: nextId(), role: "user", text: option });
    runSearch(`${m.request}, ${option}`, { asked: true });
  }

  function pickImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setNotice("That file isn't a photo. Try a JPG or PNG.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setNotice("That photo is over 10 MB. Try a smaller one.");
      return;
    }
    if (image) URL.revokeObjectURL(image);
    setImage(URL.createObjectURL(file));
    setImageFile(file);
    setNotice(null);
  }

  function clearImage() {
    if (image) URL.revokeObjectURL(image);
    setImage(null);
    setImageFile(null);
  }

  function toggleVendor(id: string, slug: string) {
    setMessages((ms) =>
      ms.map((m) =>
        m.role === "errand" && m.kind === "results" && m.id === id
          ? { ...m, openVendor: m.openVendor === slug ? null : slug }
          : m,
      ),
    );
  }

  function newChat() {
    messages.forEach((m) => m.role === "user" && m.imageUrl && URL.revokeObjectURL(m.imageUrl));
    setMessages([]);
    setInput("");
    clearImage();
    setNotice(null);
  }

  function setSort(id: string, sort: SortKey) {
    setMessages((ms) => ms.map((m) => (m.role === "errand" && m.kind === "results" && m.id === id ? { ...m, sort } : m)));
  }

  function moreLikeThis(id: string) {
    setMessages((ms) =>
      ms.map((m) => (m.role === "errand" && m.kind === "results" && m.id === id ? { ...m, shown: m.shown + 3 } : m)),
    );
  }

  function cheaper(m: ResultsMsg) {
    const prices = m.results.map((r) => r.priceKobo).filter((n): n is number => n !== null);
    add({ id: nextId(), role: "user", text: "Cheaper options" });
    if (prices.length === 0) {
      add({ id: nextId(), role: "errand", kind: "note", request: m.request, text: "These vendors share prices on request. A real person can compare them for you." });
      return;
    }
    runSearch(m.request, { budgetOverrideKobo: Math.floor(Math.min(...prices) * 0.9), asked: true });
  }

  function handOff(request: string) {
    if (!TEAM_WHATSAPP) {
      setNotice("The team's WhatsApp number isn't set up yet.");
      return;
    }
    void logHandoff(request);
    const text = `Hi Shop Plug team! I'm looking for: ${request}`;
    window.open(`https://wa.me/${TEAM_WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const composer = (big: boolean, placeholder?: string) => (
    <Composer
      big={big}
      value={input}
      onChange={setInput}
      onSend={() => send()}
      imagePreview={image}
      onPickImage={pickImage}
      onClearImage={clearImage}
      notice={notice}
      busy={isPending}
      fileInputRef={fileInputRef}
      placeholder={placeholder}
    />
  );

  // ---------- Home: before the first message ----------
  if (messages.length === 0) {
    return (
      <>
      <style>{THEME_STYLES}</style>
      {NO_SIDEWAYS}
      {CHRISTMAS && <FestiveBackdrop />}
      <div className="relative z-10 mx-auto flex min-h-dvh w-full min-w-0 max-w-5xl flex-col bg-[linear-gradient(180deg,#FFF7F0_0%,#FFFFFF_30%,#FFF9F4_100%)] px-4 pb-8 pt-5 sm:px-6">
        {CHRISTMAS && (
          <div className="mb-1 flex justify-center">
            <ChristmasBadge />
          </div>
        )}
        <header className="flex min-h-10 items-center justify-between gap-2 sm:gap-4">
          <Link href="/" aria-label={`${BRAND} home`} className="flex min-w-0 shrink items-center">
            <img src="/brand/shop-plug-logo.png" alt="Shop Plug" className="h-7 max-w-[104px] w-auto object-contain mix-blend-multiply sm:h-8 sm:max-w-[126px]" />
          </Link>
          <nav aria-label="Main navigation" className="ml-auto flex shrink-0 items-center gap-3 sm:gap-5">
            <a href="/find-a-plug" className="whitespace-nowrap text-[11px] font-semibold text-[#6D5141] transition hover:text-[#E96512] sm:text-xs">Find a Plug</a>
            <Link href="/vendor/signup" className="whitespace-nowrap text-[11px] font-bold text-[#E96512] transition hover:text-[#B94A0B] sm:text-xs">
              Sell on Shop Plug
            </Link>
          </nav>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-5 pb-5 pt-5">
          <section className="relative isolate grid min-h-[226px] grid-cols-[1fr_1fr] items-center overflow-hidden rounded-[26px] bg-[#FFF0E4] pl-5 pr-1 py-5 sm:min-h-[270px] sm:pl-7 sm:pr-3 sm:py-7">
            <div className="relative z-10 py-2">
              <p className="mb-2 inline-flex rounded-full bg-white/75 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.16em] text-[#C65A18] sm:text-[9px]">Your neighbourhood marketplace</p>
              <h1 className="ndu-rise max-w-[270px] text-[27px] font-extrabold leading-[1.04] tracking-[-0.045em] text-[#20202A] sm:max-w-[390px] sm:text-[42px]">
                Order from stores around you.
              </h1>
              <p className="mt-2 max-w-[220px] text-[11px] font-medium leading-relaxed text-[#625B58] sm:mt-3 sm:text-sm">Get what you need delivered fast.</p>
            </div>
            <div className="relative -mr-1 flex h-full min-h-[190px] items-center justify-center self-stretch overflow-hidden sm:-mr-3 sm:min-h-[230px]">
              <img
                src="/brand/hero-customer.jpg"
                alt="Shop Plug customer browsing local stores"
                className="absolute inset-0 h-full w-[116%] max-w-none -translate-x-[5%] scale-[1.06] object-cover object-[center_30%] mix-blend-multiply"
                style={{
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 23%, black 100%)",
                  maskImage: "linear-gradient(to right, transparent 0%, black 23%, black 100%)",
                }}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-[48%] bg-gradient-to-r from-[#FFF0E4] via-[#FFF0E4]/65 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#FFF0E4]/55 to-transparent" />
            </div>
          </section>

          <div className="rounded-[22px] border border-[#F0E5DC] bg-white p-1.5 shadow-[0_8px_24px_rgba(82,48,24,0.08)]">
            <Composer
              big
              value={input}
              onChange={setInput}
              onSend={() => send()}
              imagePreview={image}
              onPickImage={pickImage}
              onClearImage={clearImage}
              notice={notice}
              busy={isPending}
              fileInputRef={fileInputRef}
              placeholder="Chat to buy what you want"
            />
          </div>
          <HomepageDiscovery stores={homepage.stores} deliveries={homepage.deliveries} onAsk={(text) => send(text)} />

          <section aria-label="Find a product by chat or photo" className="mt-1 space-y-3">
            <div className="rounded-[22px] border border-[#F0E5DC] bg-white p-1.5 shadow-[0_8px_24px_rgba(82,48,24,0.08)]">
              {composer(true, "Chat to find a product or upload a photo")}
            </div>
            <div className="rounded-[22px] border border-[#F0E5DC] bg-white px-4 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-extrabold tracking-tight text-[#20202A] sm:text-base">Discover how people are using Shop Plug</h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#71665F]">Real customer videos, WhatsApp messages and stories from the community.</p>
                </div>
                <span aria-hidden="true" className="text-xl text-[#E96512]">↗</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex min-h-28 flex-col items-center justify-center rounded-[16px] bg-[#FFF5ED] p-3 text-center">
                  <span className="text-2xl">▶</span>
                  <span className="mt-2 text-xs font-bold text-[#38313A]">Customer videos</span>
                </div>
                <div className="flex min-h-28 flex-col items-center justify-center rounded-[16px] bg-[#F7F4F1] p-3 text-center">
                  <span className="text-2xl">💬</span>
                  <span className="mt-2 text-xs font-bold text-[#38313A]">Customer messages</span>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-[#8A817B]">Customer stories will appear here.</p>
            </div>
          </section>
        </main>

        <p className="mt-4 text-center text-xs text-mute">Vendors are vetted and verified by Shop Plug.</p>
      </div>
      </>
    );
  }

  // ---------- Chat: after the first message ----------
  const actions = (m: ResultsMsg | NoteMsg | QuestionMsg) => (
    <div className="flex flex-wrap gap-2 px-4">
      {m.kind === "results" && m.shown < m.results.length && <Chip onClick={() => moreLikeThis(m.id)}>More like this</Chip>}
      {m.kind === "results" && <Chip onClick={() => cheaper(m)}>Cheaper</Chip>}
      <button
        type="button"
        onClick={() => handOff(m.request)}
        className="flex h-11 items-center gap-1.5 rounded-full border border-accent px-3.5 text-sm font-semibold text-accent"
      >
        <IconPerson /> Hand to a real person
      </button>
    </div>
  );

  return (
    <>
    <style>{THEME_STYLES}</style>
    {NO_SIDEWAYS}
      {CHRISTMAS && <FestiveBackdrop />}
    <div className="relative z-10 mx-auto flex h-dvh w-full min-w-0 max-w-xl flex-col pt-4">
      <header className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5">
          <button type="button" onClick={newChat} className="h-11 px-2 text-base font-bold tracking-tight">{BRAND}</button>
          {CHRISTMAS && <ChristmasBadge />}
        </span>
        <button
          type="button"
          onClick={newChat}
          aria-label="New chat"
          className="flex h-11 w-11 items-center justify-center rounded-full text-mute hover:text-snow"
        >
          <IconPlus />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto py-2" aria-live="polite">
        <div className="flex flex-col gap-5">
          {messages.map((m) => {
            if (m.role === "user") {
              return (
                <div key={m.id} className="ml-auto mr-4 flex max-w-[78%] flex-col items-end gap-1.5">
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt="Your photo" className="h-24 w-20 rounded-2xl object-cover" />
                  )}
                  {m.text && (
                    <p className="rounded-[20px] rounded-br-md bg-accent px-4 py-3 text-[15px] font-medium leading-snug text-night">
                      {m.text}
                    </p>
                  )}
                  {m.tags && <p className="text-[11px] text-mute">{m.tags}</p>}
                </div>
              );
            }

            if (m.kind === "note") {
              return (
                <section key={m.id} className="flex flex-col gap-3">
                  <p className="px-4 text-[15px] leading-relaxed">{m.text}</p>
                  {m.id === lastErrandId && actions(m)}
                </section>
              );
            }

            if (m.kind === "question") {
              return (
                <section key={m.id} className="flex flex-col gap-3">
                  <p className="px-4 text-[15px] leading-relaxed">{m.text}</p>
                  {m.id === lastErrandId && (
                    <div className="flex flex-wrap gap-2 px-4">
                      {m.options.map((o) => (
                        <Chip key={o} onClick={() => answer(m, o)}>{o}</Chip>
                      ))}
                    </div>
                  )}
                  {m.id === lastErrandId && <p className="px-4 text-xs text-mute">Or type your answer below.</p>}
                </section>
              );
            }

            const n = m.results.length;
            const open = m.openVendor ? m.results.find((r) => r.vendorSlug === m.openVendor) : undefined;
            return (
              <section key={m.id} className="flex flex-col gap-3" aria-label="Products found">
                <div className="px-4">
                  <p className="text-[15px] leading-relaxed">{m.reply}</p>
                  <p className="mt-0.5 text-xs text-mute">
                    {n} Calabar {n === 1 ? "vendor" : "vendors"}{n > 1 ? " · swipe to compare" : ""} · ranked fairly, nobody pays to be on top
                  </p>
                  {m.budgetKobo && <p className="mt-0.5 text-xs text-mute">Up to {formatNaira(m.budgetKobo)}</p>}
                </div>

                {n > 1 && (
                  <div role="group" aria-label="Sort results" className="flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
                    <span className="shrink-0 text-[13px] text-mute">Sort</span>
                    {SORTS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        aria-pressed={m.sort === s.key}
                        onClick={() => setSort(m.id, s.key)}
                        className={`h-10 shrink-0 rounded-full border px-3.5 text-[13px] transition ${
                          m.sort === s.key ? "border-accent bg-accent font-bold text-night" : "border-line-strong"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
                  {sortResults(m.results, m.sort)
                    .slice(0, m.shown)
                    .map((r) => (
                      <ResultCard
                        key={r.productId}
                        r={r}
                        marketUrl={MARKET_URL}
                        moreOpen={m.openVendor === r.vendorSlug}
                        onToggleMore={() => toggleVendor(m.id, r.vendorSlug)}
                      />
                    ))}
                </div>

                {open && (
                  <div className="mx-4 rounded-[22px] border border-line bg-panel p-3" aria-label={`More from ${open.vendorName}`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">More from {open.vendorName}</p>
                      <a
                        href={`${MARKET_URL}/s/${open.vendorSlug}?from=chat`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[13px] font-semibold text-accent"
                      >
                        Visit store →
                      </a>
                    </div>
                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
                      {open.more.map((p) => (
                        <a
                          key={p.productId}
                          href={`${MARKET_URL}/s/${open.vendorSlug}/p/${p.productId}?from=chat`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-28 shrink-0"
                        >
                          <div className="h-28 overflow-hidden rounded-2xl bg-[#2A2B31]">
                            {p.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <p className="mt-1 text-[13px] font-bold">{formatPrice(p)}</p>
                          <p className="truncate text-xs text-mute">{p.name}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {m.id === lastErrandId && actions(m)}
              </section>
            );
          })}

          {isPending &&
            (EXPERIMENTS.searchingAnimation ? (
              <Searching area={prefs.area} tonight={prefs.tonight} delivered={prefs.delivered} />
            ) : (
              <p className="animate-pulse px-4 text-sm text-mute">Checking Calabar vendors…</p>
            ))}
          <div ref={endRef} />
        </div>
      </main>

      <div className="px-4 pb-5 pt-2">
        {EXPERIMENTS.quickChips && <QuickChips prefs={prefs} onChange={setPrefs} />}
        {composer(false)}
      </div>
    </div>
    </>
  );
}

function Chip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-full border border-line-strong px-3.5 text-sm transition hover:border-mute"
    >
      {children}
    </button>
  );
}
