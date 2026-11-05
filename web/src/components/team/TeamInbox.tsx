"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  askDetails,
  getConversation,
  getReceipt,
  listRequests,
  markSeen,
  reply,
  sendQuote,
  setStatus,
  type InboxMessage,
  type InboxRequest,
} from "@/app/team/actions";
import { formatNaira } from "@/lib/format";
import { lagosNow } from "@/lib/hours";

type Pricing = { faresKobo: number[]; lateKobo: number; bulkyKobo: number; commissionKobo: number };

const STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-amber-100 text-amber-800" },
  quoted: { label: "Bill sent", tone: "bg-blue-100 text-blue-800" },
  payment_claimed: { label: "Says paid · check", tone: "bg-purple-100 text-purple-800" },
  paid: { label: "Paid", tone: "bg-brand-tint text-brand-dark" },
  on_the_way: { label: "On the way", tone: "bg-sky-100 text-sky-800" },
  delivered: { label: "Delivered", tone: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", tone: "bg-gray-100 text-gray-500" },
};

const isUnread = (r: InboxRequest) =>
  Boolean(r.last_customer_at) && (!r.team_seen_at || new Date(r.last_customer_at as string) > new Date(r.team_seen_at));

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(
    new Date(iso),
  );

// A short "ding" when a customer writes (works after you've tapped the page once).
function ding() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {}
}

export default function TeamInbox({ pricing }: { pricing: Pricing }) {
  const [list, setList] = useState<InboxRequest[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const unreadBefore = useRef(0);

  const loadList = useCallback(async () => {
    const rows = await listRequests();
    setList(rows);
    const unread = rows.filter(isUnread).length;
    if (unread > unreadBefore.current) ding();
    unreadBefore.current = unread;
    document.title = unread ? `(${unread}) Shor plug inbox` : "Shor plug inbox";
  }, []);

  useEffect(() => {
    void loadList();
    const t = setInterval(() => void loadList(), 5000);
    return () => clearInterval(t);
  }, [loadList]);

  const shown = list.filter((r) => filter === "all" || !["delivered", "cancelled"].includes(r.status));

  return (
    <div className="flex h-dvh bg-gray-50 text-ink">
      {/* Request list (on phones: hidden while a conversation is open) */}
      <aside className={`w-full shrink-0 flex-col border-r border-gray-200 bg-white md:flex md:w-80 ${openId ? "hidden" : "flex"}`}>
        <div className="border-b border-gray-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-bold">Shor plug inbox</h1>
            <Link href="/team/strip" className="text-sm font-semibold text-brand">Photo strip →</Link>
          </div>
          <div className="mt-2 flex gap-2 text-sm">
            {(["active", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`min-h-9 rounded-full px-3 ${filter === f ? "bg-ink font-semibold text-white" : "bg-gray-100"}`}
              >
                {f === "active" ? "Open" : "All"}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {shown.length === 0 && <li className="p-6 text-center text-sm text-gray-500">No requests yet. They&apos;ll appear here.</li>}
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${openId === r.id ? "bg-brand-tint" : ""}`}
              >
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${isUnread(r) ? "bg-orange-500" : "bg-transparent"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{r.customer_name || "New customer"}</span>
                    <span className="shrink-0 text-xs text-gray-400">{time(r.updated_at)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs">
                    <span className="text-gray-500">{r.code}</span>
                    {r.area && <span className="text-gray-500">· {r.area}</span>}
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS[r.status]?.tone ?? ""}`}>{STATUS[r.status]?.label ?? r.status}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={`min-w-0 flex-1 flex-col ${openId ? "flex" : "hidden md:flex"}`}>
        {openId ? (
          <Conversation key={openId} id={openId} pricing={pricing} onBack={() => setOpenId(null)} onChanged={loadList} />
        ) : (
          <div className="m-auto text-sm text-gray-500">Choose a request on the left.</div>
        )}
      </section>
    </div>
  );
}

function Conversation({
  id,
  pricing,
  onBack,
  onChanged,
}: {
  id: string;
  pricing: Pricing;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [req, setReq] = useState<InboxRequest | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await getConversation(id, lastId.current);
    if (!res) return;
    setReq(res.request);
    if (res.messages.length) {
      lastId.current = res.messages[res.messages.length - 1].id;
      setMessages((m) => [...m, ...res.messages.filter((x) => !m.some((y) => y.id === x.id))]);
      if (res.messages.some((x) => x.sender === "customer")) {
        await markSeen(id);
        onChanged();
      }
    }
  }, [id, onChanged]);

  useEffect(() => {
    void load();
    void markSeen(id).then(onChanged);
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [id, load, onChanged]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await reply(id, text);
    if (res.ok) {
      setText("");
      await load();
      onChanged();
    } else setError(res.error);
    setBusy(false);
  }

  async function changeStatus(s: "paid" | "on_the_way" | "delivered" | "cancelled") {
    setBusy(true);
    setError(null);
    const res = await setStatus(id, s);
    if (!res.ok) setError(res.error);
    setConfirmCancel(false);
    await load();
    onChanged();
    setBusy(false);
  }

  if (!req) return <div className="m-auto text-sm text-gray-500">Loading…</div>;

  const waNumber = req.phone ? `234${req.phone.replace(/\D/g, "").replace(/^0/, "")}` : null;
  const forPlug = [
    `Shor plug request ${req.code}`,
    req.customer_name && `Customer: ${req.customer_name}`,
    req.phone && `Phone: ${req.phone}`,
    req.address && `Address: ${req.address}${req.area ? ` (${req.area})` : ""}`,
    req.quote && `Items: ${req.quote.items.map((i) => `${i.label} (${formatNaira(i.amount_kobo)})`).join("; ")}`,
    req.quote && `Customer paid: ${formatNaira(req.quote.total_kobo)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <header className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back to list" className="flex h-10 w-10 items-center justify-center rounded-full text-xl md:hidden">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {req.customer_name || "New customer"} <span className="font-normal text-gray-400">· {req.code}</span>
          </p>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[req.status]?.tone ?? ""}`}>
            {STATUS[req.status]?.label ?? req.status}
          </span>
        </div>
        {req.phone && (
          <a href={`tel:${req.phone}`} className="min-h-10 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold">
            📞 Call
          </a>
        )}
        {waNumber && (
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="min-h-10 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold">
            WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(forPlug);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {}
          }}
          className="min-h-10 rounded-full bg-ink px-3 py-2 text-sm font-semibold text-white"
        >
          {copied ? "Copied ✓" : "Copy for plug"}
        </button>
      </header>

      {(req.phone || req.address) && (
        <div className="border-b border-gray-200 bg-white px-4 py-2 text-sm text-gray-700">
          {req.phone && <span className="mr-4">📞 {req.phone}</span>}
          {req.address && (
            <span>
              📍 {req.address}
              {req.area ? ` · ${req.area}` : ""}
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
          {messages.map((m) => {
            if (m.kind === "status") {
              return (
                <p key={m.id} className="mx-auto rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-700">
                  {m.body}
                </p>
              );
            }
            const mine = m.sender === "team";
            return (
              <div key={m.id} className={`max-w-[80%] ${mine ? "ml-auto text-right" : ""}`}>
                <p
                  className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[15px] ${
                    mine ? "bg-brand text-white" : "bg-white shadow-sm"
                  } ${m.kind === "paid" ? "font-semibold ring-2 ring-purple-300" : ""}`}
                >
                  {m.kind === "quote"
                    ? "🧾 Bill sent"
                    : m.kind === "paid"
                      ? "💸 Customer says: I've paid"
                      : m.kind === "ask_details"
                        ? "📋 Asked for delivery details"
                        : m.body}
                </p>
                {m.kind === "paid" && m.data?.receipt_id && (
                  <button
                    type="button"
                    onClick={async () => {
                      const img = await getReceipt(m.data?.receipt_id as number);
                      if (img) setReceipt(img);
                      else setError("Couldn't load that receipt. Please try again.");
                    }}
                    className="mt-1 block min-h-9 rounded-full bg-purple-600 px-3 text-sm font-semibold text-white"
                  >
                    🧾 View receipt
                  </button>
                )}
                <p className="mt-0.5 text-[11px] text-gray-400">{time(m.created_at)}</p>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {receipt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Payment receipt"
          onClick={() => setReceipt(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receipt} alt="Customer's payment receipt" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <button type="button" onClick={() => setReceipt(null)} className="min-h-11 rounded-full bg-white px-5 font-semibold">
            Close
          </button>
        </div>
      )}

      {/* Actions for this request */}
      <div className="border-t border-gray-200 bg-white px-3 pt-3">
        {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="mb-2 flex flex-wrap gap-2 text-sm">
          {!req.phone && !["delivered", "cancelled"].includes(req.status) && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const res = await askDetails(id);
                if (!res.ok) setError(res.error);
                await load();
                onChanged();
                setBusy(false);
              }}
              className="min-h-10 rounded-full border border-gray-300 px-3 font-semibold"
            >
              📋 Ask for delivery details
            </button>
          )}
          {!["delivered", "cancelled"].includes(req.status) && (
            <button type="button" onClick={() => setShowBill((s) => !s)} className="min-h-10 rounded-full border border-brand px-3 font-semibold text-brand">
              {showBill ? "Hide bill" : req.quote ? "Send a new bill" : "Send bill"}
            </button>
          )}
          {["quoted", "payment_claimed"].includes(req.status) && (
            <button type="button" disabled={busy} onClick={() => changeStatus("paid")} className="min-h-10 rounded-full bg-brand px-3 font-semibold text-white">
              ✓ Payment received
            </button>
          )}
          {req.status === "paid" && (
            <button type="button" disabled={busy} onClick={() => changeStatus("on_the_way")} className="min-h-10 rounded-full bg-brand px-3 font-semibold text-white">
              Plug is on the way
            </button>
          )}
          {req.status === "on_the_way" && (
            <button type="button" disabled={busy} onClick={() => changeStatus("delivered")} className="min-h-10 rounded-full bg-brand px-3 font-semibold text-white">
              Delivered
            </button>
          )}
          {!["delivered", "cancelled"].includes(req.status) &&
            (confirmCancel ? (
              <button type="button" disabled={busy} onClick={() => changeStatus("cancelled")} className="min-h-10 rounded-full bg-red-600 px-3 font-semibold text-white">
                Tap again to cancel
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-10 rounded-full px-3 text-gray-500">
                Cancel request
              </button>
            ))}
        </div>

        {showBill && (
          <BillBuilder
            pricing={pricing}
            onSend={async (input) => {
              setBusy(true);
              setError(null);
              const res = await sendQuote(id, input);
              if (res.ok) {
                setShowBill(false);
                await load();
                onChanged();
              } else setError(res.error);
              setBusy(false);
            }}
            busy={busy}
          />
        )}

        <form onSubmit={send} className="flex gap-2 pb-4">
          <label htmlFor="team-reply" className="sr-only">Reply</label>
          <input
            id="team-reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply as Shor plug…"
            maxLength={2000}
            className="min-h-12 flex-1 rounded-full border border-gray-200 px-4 text-base focus:border-brand focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className="min-h-12 rounded-full bg-ink px-5 font-semibold text-white disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </>
  );
}

function BillBuilder({
  pricing,
  onSend,
  busy,
}: {
  pricing: Pricing;
  onSend: (input: { items: { label: string; naira: string }[]; fareNaira: string; late: boolean; bulky: boolean }) => void;
  busy: boolean;
}) {
  const now = lagosNow();
  const [items, setItems] = useState([{ label: "", naira: "" }]);
  const [fare, setFare] = useState("");
  const [late, setLate] = useState(now.minute >= 22 * 60 || now.minute < 6 * 60); // on automatically 10pm – 6am
  const [bulky, setBulky] = useState(false);

  const naira = (s: string) => Math.max(0, Number(String(s).replace(/[,\s₦]/g, "")) || 0);
  const itemsKobo = items.reduce((s, i) => s + Math.round(naira(i.naira) * 100), 0);
  const fareKobo = Math.round(naira(fare) * 100);
  const extras = (late ? pricing.lateKobo : 0) + (bulky ? pricing.bulkyKobo : 0);
  const total = itemsKobo + fareKobo + extras;
  const plugGets = Math.max(0, fareKobo + extras - pricing.commissionKobo);
  const input = "min-h-11 rounded-xl border border-gray-200 px-3 text-base focus:border-brand focus:outline-none";

  return (
    <div className="mb-3 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-sm font-semibold">Items (what the plug will buy)</p>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input
            aria-label={`Item ${i + 1}`}
            placeholder="e.g. 2 x Baileys 1L"
            value={it.label}
            onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            className={`${input} min-w-0 flex-1`}
          />
          <input
            aria-label={`Item ${i + 1} price in naira`}
            placeholder="₦"
            inputMode="numeric"
            value={it.naira}
            onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, naira: e.target.value } : x)))}
            className={`${input} w-28`}
          />
          {items.length > 1 && (
            <button type="button" aria-label="Remove item" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="px-2 text-gray-400">
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => setItems((l) => [...l, { label: "", naira: "" }])} className="text-sm font-semibold text-brand">
        + Add item
      </button>

      <div>
        <p className="mb-1.5 text-sm font-semibold">Transport fare</p>
        <div className="flex flex-wrap items-center gap-2">
          {pricing.faresKobo.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={fareKobo === k}
              onClick={() => setFare(String(k / 100))}
              className={`min-h-10 rounded-full border px-3 text-sm ${fareKobo === k ? "border-brand bg-brand text-white" : "border-gray-200 bg-white"}`}
            >
              {formatNaira(k)}
            </button>
          ))}
          <input aria-label="Other fare in naira" placeholder="Other ₦" inputMode="numeric" value={fare} onChange={(e) => setFare(e.target.value)} className={`${input} w-28`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-brand" checked={late} onChange={(e) => setLate(e.target.checked)} />
          Late night (+{formatNaira(pricing.lateKobo)})
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-brand" checked={bulky} onChange={(e) => setBulky(e.target.checked)} />
          10+ large items (+{formatNaira(pricing.bulkyKobo)})
        </label>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
        <span className="text-sm text-gray-600">
          Customer pays <strong className="text-base text-ink">{formatNaira(total)}</strong>
        </span>
        <span className="text-xs text-gray-500">
          Plug gets {formatNaira(plugGets)} · Shor plug {formatNaira(pricing.commissionKobo)}
        </span>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onSend({ items, fareNaira: fare, late, bulky })}
        className="min-h-11 w-full rounded-full bg-brand font-semibold text-white disabled:opacity-60"
      >
        Send bill to customer
      </button>
    </div>
  );
}
