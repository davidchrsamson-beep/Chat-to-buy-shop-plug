"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  deleteMessage,
  markPaid,
  pollRequest,
  saveDetails,
  sendMessage,
  startRequest,
  type PlugMessage,
  type Quote,
  type RequestState,
} from "@/app/request-actions";
import { CALABAR_AREAS } from "@/lib/areas";
import { BRAND } from "@/lib/brand";
import { EXPERIMENTS } from "@/lib/experiments";
import { formatNaira } from "@/lib/format";
import { lagosNow } from "@/lib/hours";
import { appPath } from "@/lib/paths";
import { shrinkPhoto } from "@/lib/photo";
import PlugFace from "./PlugFace";
import { ThemeToggle } from "./Theme";

const TEAM_WHATSAPP = (process.env.NEXT_PUBLIC_TEAM_WHATSAPP ?? "").replace(/\D/g, "");
const TOKEN_KEY = "shorplug-token";
const REQUEST_KEY = "shorplug-request";
const POLL_MS = 4000;

// Remembered on this phone only (a convenience; the chat still works if it isn't available).
function store(key: string, value?: string | null) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  return null;
}

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function savedRequestCode(): string | null {
  const raw = store(REQUEST_KEY);
  try {
    return raw ? (JSON.parse(raw).code as string) : null;
  } catch {
    return null;
  }
}

type Props = {
  initialText?: string;
  onBack: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

// The cozy chat: the customer says what they need, the team replies and sends the bill,
// the customer pays by transfer, and a plug delivers and calls them.
export default function RequestChat({ initialText = "", onBack, theme, onToggleTheme }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [req, setReq] = useState<{ id: string; code: string } | null>(null);
  const [state, setState] = useState<Omit<RequestState, "messages"> | null>(null);
  const [messages, setMessages] = useState<PlugMessage[]>([]);
  const [input, setInput] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [greeting, setGreeting] = useState("Hello");

  // "Good morning / afternoon / evening", by the time in Calabar.
  useEffect(() => {
    const h = lagosNow().minute / 60;
    setGreeting(h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  // Load (or create) this phone's secret code, and resume an open request.
  useEffect(() => {
    let t = store(TOKEN_KEY);
    if (!t || !/^[a-f0-9]{64}$/.test(t)) {
      t = newToken();
      store(TOKEN_KEY, t);
    }
    setToken(t);
    try {
      const saved = JSON.parse(store(REQUEST_KEY) ?? "null");
      if (saved?.id && saved?.code) setReq(saved);
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!req || !token) return;
    const res = await pollRequest(req.id, token, lastId.current);
    if (!res) return;
    const { messages: fresh, ...rest } = res;
    setState(rest);
    const gone = new Set(rest.deleted ?? []);
    setMessages((m) => {
      const merged = [...m, ...fresh.filter((f) => !m.some((x) => x.id === f.id))];
      return merged.map((x) => (gone.has(x.id) ? { ...x, body: "", deleted: true } : x));
    });
    if (fresh.length) lastId.current = fresh[fresh.length - 1].id;
  }, [req, token]);

  // Check for replies every few seconds while the chat is open and on screen.
  useEffect(() => {
    if (!req || !token) return;
    void refresh();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [req, token, refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, state?.status, state?.has_details, busy]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy || !token) return;
    setBusy(true);
    setError(null);
    let current = req;
    if (!current) {
      const started = await startRequest(token);
      if (!started.ok) {
        setError(started.error);
        setBusy(false);
        return;
      }
      current = { id: started.id, code: started.code };
      setReq(current);
      store(REQUEST_KEY, JSON.stringify(current));
    }
    const res = await sendMessage(current.id, token, text);
    if (res.ok) {
      setInput("");
      const poll = await pollRequest(current.id, token, lastId.current);
      if (poll) {
        const { messages: fresh, ...rest } = poll;
        setState(rest);
        if (fresh.length) {
          lastId.current = fresh[fresh.length - 1].id;
          setMessages((m) => [...m, ...fresh.filter((f) => !m.some((x) => x.id === f.id))]);
        }
      }
    } else setError(res.error);
    setBusy(false);
  }

  // Sends the receipt photo. Receipts are shrunk on the phone so they upload fast but stay readable.
  // Deletes one of the customer's own messages (the words are wiped from our records).
  async function remove(messageId: number) {
    if (!req || !token) return;
    setBusy(true);
    const res = await deleteMessage(req.id, token, messageId);
    if (res.ok) {
      setMessages((ms) => ms.map((x) => (x.id === messageId ? { ...x, body: "", deleted: true } : x)));
      setPickedId(null);
      setConfirmDelete(false);
    } else setError(res.error);
    setBusy(false);
  }

  async function paid(file: File): Promise<boolean> {
    if (!req || !token || busy) return false;
    setBusy(true);
    setError(null);
    let ok = false;
    try {
      let image = await shrinkPhoto(file, 1400);
      if (image.length > 700_000) image = await shrinkPhoto(file, 1000); // keeps uploads well under the 1 MB limit
      const res = await markPaid(req.id, token, image);
      if (res.ok) ok = true;
      else setError(res.error);
    } catch {
      setError("We couldn't open that picture. Try a screenshot or another photo.");
    }
    await refresh();
    setBusy(false);
    return ok;
  }

  function startOver() {
    store(REQUEST_KEY, null);
    setReq(null);
    setState(null);
    setMessages([]);
    lastId.current = 0;
    setInput("");
  }

  const customerSpoke = messages.some((m) => m.sender === "customer");
  const teamSpoke = messages.some((m) => m.sender === "team");
  const finished = state?.status === "delivered" || state?.status === "cancelled";
  const helpLink =
    TEAM_WHATSAPP && req
      ? `https://wa.me/${TEAM_WHATSAPP}?text=${encodeURIComponent(`Hi ${BRAND}, about my request ${req.code}`)}`
      : null;

  return (
    <div className="relative z-10 mx-auto flex h-dvh w-full min-w-0 max-w-xl flex-col">
      {/* Header: the plug's face and name */}
      <header className="flex items-center gap-2 border-b border-line px-2 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to home"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-mute hover:text-snow"
        >
          ‹
        </button>
        <PlugFace size={40} online />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">{BRAND}</p>
          <p className="truncate text-xs text-mute">
            Replies in minutes, day or late night
          </p>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        <div className="flex flex-col gap-3">
          {/* The only automatic message: a greeting for the time of day in Calabar */}
          <PlugBubble>{greeting}, what can we help you get?</PlugBubble>

          {messages.map((m) => {
            if (m.kind === "quote" && m.data) {
              return (
                <QuoteCard
                  key={m.id}
                  quote={m.data}
                  code={req?.code ?? ""}
                  bank={state?.bank ?? null}
                  canPay={(state?.status === "quoted" || state?.status === "payment_claimed") && m.data.sent_at === state?.quote?.sent_at}
                  resend={state?.status === "payment_claimed"}
                  onPaid={paid}
                  busy={busy}
                />
              );
            }
            if (m.kind === "ask_details") {
              // The team asked for delivery details: show the form (once), or a thank-you once sent.
              const latestAsk = [...messages].reverse().find((x) => x.kind === "ask_details")?.id === m.id;
              if (state && !state.has_details && latestAsk && req && token) {
                return <DetailsCard key={m.id} requestId={req.id} token={token} onSaved={refresh} />;
              }
              return (
                <p key={m.id} className="mx-auto rounded-full bg-panel px-3.5 py-1.5 text-center text-xs font-medium">
                  {state?.has_details ? "Delivery details sent ✓" : m.body}
                </p>
              );
            }
            if (m.kind === "status") {
              return (
                <p key={m.id} className="mx-auto max-w-[85%] rounded-full bg-panel px-3.5 py-1.5 text-center text-xs font-medium">
                  {m.body}
                </p>
              );
            }
            if (m.sender === "customer") {
              if (m.deleted) {
                return (
                  <p key={m.id} className="ml-auto max-w-[80%] rounded-[20px] rounded-br-md border border-line px-4 py-2.5 text-sm italic text-mute">
                    You deleted this message
                  </p>
                );
              }
              const canDelete = m.kind === "text";
              const picked = pickedId === m.id;
              return (
                <div key={m.id} className="ml-auto flex max-w-[80%] flex-col items-end gap-1">
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => {
                      setPickedId(picked ? null : m.id);
                      setConfirmDelete(false);
                    }}
                    aria-expanded={canDelete ? picked : undefined}
                    aria-label={canDelete ? "Message options" : undefined}
                    className="whitespace-pre-wrap break-words rounded-[20px] rounded-br-md bg-accent px-4 py-2.5 text-left text-[15px] leading-snug text-night disabled:cursor-default"
                  >
                    {m.kind === "paid" ? "I've paid · receipt sent 🧾" : m.body}
                  </button>
                  {picked && canDelete && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => (confirmDelete ? void remove(m.id) : setConfirmDelete(true))}
                      className={`min-h-9 rounded-full px-3 text-xs font-semibold ${confirmDelete ? "bg-red-600 text-white" : "border border-line text-red-600"}`}
                    >
                      {confirmDelete ? "Tap again to delete" : "Delete message"}
                    </button>
                  )}
                </div>
              );
            }
            return <PlugBubble key={m.id}>{m.body}</PlugBubble>;
          })}

          {/* After the first message: where to deliver and how the plug can call */}
          {EXPERIMENTS.autoAssist && customerSpoke && state && !state.has_details && req && token && !messages.some((x) => x.kind === "ask_details") && (
            <DetailsCard requestId={req.id} token={token} onSaved={refresh} />
          )}
          {EXPERIMENTS.autoAssist && customerSpoke && state?.has_details && !teamSpoke && (
            <PlugBubble>
              Got it! Your request is in. Your bill will come right here, usually within a few minutes. Your plug will call you on{" "}
              {state.phone}.
            </PlugBubble>
          )}

          {state?.status === "payment_claimed" && (
            <p className="mx-auto max-w-[90%] rounded-2xl bg-panel px-3.5 py-2 text-center text-xs font-medium">
              Receipt received · we&apos;re confirming your payment.
              {helpLink && (
                <>
                  {" "}
                  Questions?{" "}
                  <a href={helpLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline">
                    WhatsApp us
                  </a>
                  .
                </>
              )}
            </p>
          )}

          {finished && (
            <button
              type="button"
              onClick={startOver}
              className="mx-auto mt-2 min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-night"
            >
              Make a new request
            </button>
          )}

          {error && (
            <p role="alert" className="mx-auto rounded-xl bg-red-500/10 px-3 py-2 text-center text-sm text-red-600">
              {error}
            </p>
          )}
          <div ref={endRef} />
        </div>
      </main>

      {!finished && (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line px-3 pb-2 pt-3">
          <label htmlFor="request-input" className="sr-only">
            Message your plug
          </label>
          <textarea
            id="request-input"
            rows={1}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={customerSpoke ? "Message your plug…" : "e.g. 2 bottles of Baileys to Marian by 1am"}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-[22px] border border-line bg-panel px-4 py-3 text-base leading-snug placeholder:text-mute focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-bold text-night transition disabled:opacity-40"
          >
            ↑
          </button>
        </form>
      )}
      <p className="pb-3 text-center text-[11px] text-mute">
        <a href={appPath("/privacy")} className="hover:underline">Privacy</a>
        <span aria-hidden="true" className="mx-1.5">•</span>
        <a href={appPath("/terms")} className="hover:underline">Terms &amp; Conditions</a>
      </p>
    </div>
  );
}

function PlugBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[85%] items-end gap-2">
      <PlugFace size={28} />
      <p className="whitespace-pre-wrap break-words rounded-[20px] rounded-bl-md bg-panel px-4 py-2.5 text-[15px] leading-snug">
        {children}
      </p>
    </div>
  );
}

function DetailsCard({ requestId, token, onSaved }: { requestId: string; token: string; onSaved: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", address: "", area: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const field =
    "w-full rounded-xl border border-line bg-night px-3.5 py-3 text-base placeholder:text-mute focus:border-accent focus:outline-none";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveDetails(requestId, token, f);
    if (res.ok) onSaved();
    else setError(res.error);
    setBusy(false);
  }

  return (
    <div className="flex max-w-[92%] items-start gap-2">
      <PlugFace size={28} />
      <form onSubmit={submit} className="min-w-0 flex-1 space-y-2.5 rounded-[20px] rounded-tl-md bg-panel p-4">
        <p className="text-[15px] font-semibold leading-snug">Nice one! Where should your plug bring it, and how can they call you?</p>
        <input aria-label="Your name" placeholder="Your name" autoComplete="name" value={f.name} onChange={set("name")} className={field} />
        <input
          aria-label="Phone number"
          placeholder="Phone number, e.g. 08012345678"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={f.phone}
          onChange={set("phone")}
          className={field}
        />
        <textarea
          aria-label="Delivery address"
          placeholder="Delivery address (street + a landmark)"
          rows={2}
          autoComplete="street-address"
          value={f.address}
          onChange={set("address")}
          className={`${field} resize-none`}
        />
        <select aria-label="Area" value={f.area} onChange={set("area")} className={field}>
          <option value="">Area (optional)</option>
          {CALABAR_AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="min-h-11 w-full rounded-full bg-accent font-bold text-night disabled:opacity-60">
          {busy ? "Saving…" : "Send my details"}
        </button>
        <p className="text-center text-[11px] text-mute">Only the {BRAND} team and your plug see these.</p>
      </form>
    </div>
  );
}

function QuoteCard({
  quote,
  code,
  bank,
  canPay,
  resend,
  onPaid,
  busy,
}: {
  quote: Quote;
  code: string;
  bank: RequestState["bank"];
  canPay: boolean;
  resend: boolean;
  onPaid: (file: File) => Promise<boolean>;
  busy: boolean;
}) {
  const [receipt, setReceipt] = useState<{ file: File; preview: string } | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const pick = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (receipt) URL.revokeObjectURL(receipt.preview);
    setReceipt({ file, preview: URL.createObjectURL(file) });
  };
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const Line = ({ label, kobo, strong }: { label: string; kobo: number; strong?: boolean }) => (
    <div className={`flex justify-between gap-3 ${strong ? "text-base font-bold" : "text-sm"}`}>
      <span className={strong ? "" : "text-mute"}>{label}</span>
      <span className="shrink-0">{formatNaira(kobo)}</span>
    </div>
  );

  return (
    <div className="flex max-w-[92%] items-start gap-2">
      <PlugFace size={28} />
      <section aria-label="Your bill" className="min-w-0 flex-1 overflow-hidden rounded-[20px] rounded-tl-md border border-line bg-panel">
        <div className="space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Your bill · {code}</p>
          {quote.items.map((it, i) => (
            <Line key={i} label={it.label} kobo={it.amount_kobo} />
          ))}
          <Line label="Transport fare" kobo={quote.fare_kobo} />
          {quote.late_kobo > 0 && <Line label="Late night (10pm – 6am)" kobo={quote.late_kobo} />}
          {quote.bulky_kobo > 0 && <Line label="Large or many items" kobo={quote.bulky_kobo} />}
          <div className="border-t border-line pt-2">
            <Line label="Total" kobo={quote.total_kobo} strong />
          </div>
        </div>

        {bank && (
          <div className="space-y-2 border-t border-line bg-night/60 p-4 text-sm">
            <p className="font-semibold">Pay by bank transfer</p>
            <p className="text-mute">
              {bank.bank} · {bank.account_name}
            </p>
            <button
              type="button"
              onClick={() => copy("account", bank.account_number)}
              className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left"
            >
              <span className="text-lg font-bold tracking-wider">{bank.account_number}</span>
              <span className="text-xs font-semibold text-accent">{copied === "account" ? "Copied ✓" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={() => copy("code", code)}
              className="flex w-full items-center justify-between rounded-xl border border-line px-3 py-2.5 text-left"
            >
              <span>
                Transfer note: <strong>{code}</strong>
              </span>
              <span className="text-xs font-semibold text-accent">{copied === "code" ? "Copied ✓" : "Copy"}</span>
            </button>
          </div>
        )}

        {canPay && (
          <div className="space-y-2.5 border-t border-line p-4">
            <p className="text-sm font-semibold">{resend ? "Need to send another receipt?" : "Paid? Send your receipt"}</p>
            <input
              ref={pickRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {receipt ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receipt.preview} alt="Your receipt" className="h-20 w-16 rounded-lg object-cover" />
                <button type="button" onClick={() => pickRef.current?.click()} className="text-sm font-semibold text-accent">
                  Change picture
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => pickRef.current?.click()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-line-strong text-sm font-semibold"
              >
                🧾 Add a screenshot or photo of your receipt
              </button>
            )}
            <button
              type="button"
              disabled={busy || !receipt}
              onClick={async () => {
                if (!receipt) return;
                if (await onPaid(receipt.file)) {
                  URL.revokeObjectURL(receipt.preview);
                  setReceipt(null);
                }
              }}
              className="min-h-12 w-full rounded-full bg-accent font-bold text-night disabled:opacity-50"
            >
              {busy ? "Sending…" : "I've paid · send receipt"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
