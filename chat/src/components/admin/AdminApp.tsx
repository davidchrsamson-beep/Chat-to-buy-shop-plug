"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { adminDb } from "@chat/lib/admin-db";
import { BRAND } from "@chat/lib/brand";
import { formatNaira } from "@chat/lib/format";
import { lagosNow } from "@chat/lib/hours";
import { LogoMark } from "../PlugFace";
import { THEME_STYLES, ThemeToggle, useTheme } from "../Theme";

// Shop Plug admin (/admin): its own login, then the inbox where requests from the
// Shop Plug site arrive. Only accounts on the team list (team_members) see anything:
// the database checks every read and every action.

type Quote = { items: { label: string; amount_kobo: number }[]; fare_kobo: number; late_kobo: number; bulky_kobo: number; total_kobo: number };
type Req = {
  id: string;
  code: string;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  status: string;
  quote: Quote | null;
  last_customer_at: string | null;
  team_seen_at: string | null;
  updated_at: string;
};
type Msg = {
  id: number;
  sender: "customer" | "team";
  kind: "text" | "quote" | "paid" | "status" | "ask_details";
  body: string;
  data: { receipt_id?: number } | null;
  deleted_at: string | null;
  created_at: string;
};
type Pricing = { faresKobo: number[]; lateKobo: number; bulkyKobo: number; commissionKobo: number };
type Phase = "loading" | "login" | "recover" | "not_team" | "ok";

const FIELDS = "id, code, customer_name, phone, address, area, status, quote, last_customer_at, team_seen_at, updated_at";
const DEFAULT_PRICING: Pricing = { faresKobo: [60000, 70000, 100000, 150000], lateKobo: 50000, bulkyKobo: 20000, commissionKobo: 10000 };

const STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "New", tone: "bg-amber-100 text-amber-900" },
  quoted: { label: "Bill sent", tone: "bg-blue-100 text-blue-900" },
  payment_claimed: { label: "Says paid · check", tone: "bg-purple-100 text-purple-900" },
  paid: { label: "Paid", tone: "bg-green-100 text-green-900" },
  on_the_way: { label: "On the way", tone: "bg-sky-100 text-sky-900" },
  delivered: { label: "Delivered", tone: "bg-gray-100 text-gray-700" },
  cancelled: { label: "Cancelled", tone: "bg-gray-100 text-gray-600" },
};

const field =
  "min-h-12 w-full rounded-xl border border-line bg-night px-4 text-base placeholder:text-mute focus:border-accent focus:outline-none";
const primary = "min-h-12 w-full rounded-full bg-accent font-bold text-night transition disabled:opacity-50";

const unread = (r: Req) =>
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

export default function AdminApp() {
  const { theme, toggle } = useTheme();
  const [phase, setPhase] = useState<Phase>("loading");
  const [email, setEmail] = useState<string | null>(null);

  const check = useCallback(async () => {
    const db = adminDb();
    const { data } = await db.auth.getSession();
    const session = data.session;
    if (!session) return setPhase("login");
    setEmail(session.user.email ?? null);
    const { data: isTeam, error } = await db.rpc("is_team");
    if (error) console.error("Team check failed:", error.message);
    setPhase(isTeam === true ? "ok" : "not_team");
  }, []);

  useEffect(() => {
    // Opened from a "reset your password" email: show the new-password form.
    if (window.location.hash.includes("type=recovery")) setPhase("recover");
    else void check();
    const { data } = adminDb().auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPhase("recover");
      if (event === "SIGNED_OUT") setPhase("login");
    });
    return () => data.subscription.unsubscribe();
  }, [check]);

  async function logOut() {
    await adminDb().auth.signOut();
    setPhase("login");
  }

  return (
    <>
      <style>{THEME_STYLES}</style>
      {phase === "ok" ? (
        <Inbox email={email} onLogOut={logOut} theme={theme} onToggleTheme={toggle} />
      ) : (
        <main className="mx-auto flex min-h-dvh w-full min-w-0 max-w-sm flex-col justify-center px-5 py-10">
          <div className="mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <LogoMark size={40} />
              <span className="text-xl font-bold tracking-tight">{BRAND} admin</span>
            </span>
            <ThemeToggle theme={theme} onToggle={toggle} />
          </div>
          {phase === "loading" && <p className="text-sm text-mute">Loading…</p>}
          {phase === "login" && <Login onDone={check} />}
          {phase === "recover" && (
            <NewPassword
              onDone={() => {
                window.history.replaceState(null, "", "/admin");
                void check();
              }}
            />
          )}
          {phase === "not_team" && <NotTeam email={email} onLogOut={logOut} />}
        </main>
      )}
    </>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="space-y-3 rounded-[22px] border border-line bg-panel p-5">{children}</div>;
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await adminDb().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMsg({ ok: false, text: "Email or password is incorrect." });
    else onDone();
  }

  async function forgot() {
    if (!email.trim()) return setMsg({ ok: false, text: "Type your email first, then tap “Forgot password?”." });
    setBusy(true);
    const { error } = await adminDb().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin` });
    setBusy(false);
    setMsg(
      error
        ? { ok: false, text: "We couldn't send the email right now. Please try again in a few minutes." }
        : { ok: true, text: "If that email is on the team, a reset link is on its way. Open it on this device." },
    );
  }

  return (
    <Card>
      <h1 className="text-lg font-bold">Log in</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} mt-1.5`} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} mt-1.5`}
          />
        </label>
        {msg && (
          <p role="alert" className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Please wait…" : "Log in"}
        </button>
      </form>
      <button type="button" onClick={forgot} disabled={busy} className="min-h-11 w-full text-sm font-semibold text-accent">
        Forgot password?
      </button>
    </Card>
  );
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    setBusy(true);
    const { error } = await adminDb().auth.updateUser({ password });
    setBusy(false);
    if (error) setError("That didn't work. Open the newest reset email and try again.");
    else onDone();
  }

  return (
    <Card>
      <h1 className="text-lg font-bold">Choose a new password</h1>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">
          New password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} mt-1.5`}
          />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </Card>
  );
}

function NotTeam({ email, onLogOut }: { email: string | null; onLogOut: () => void }) {
  return (
    <Card>
      <h1 className="text-lg font-bold">Not on the team yet</h1>
      <p className="text-sm text-mute">
        You&apos;re logged in as <strong className="text-snow">{email ?? "this account"}</strong>, which isn&apos;t on the {BRAND} team
        list. In Supabase → SQL Editor, run this, then refresh:
      </p>
      <pre className="overflow-x-auto rounded-xl bg-[#16171C] p-3 text-xs text-white">
        {`insert into public.team_members (user_id)
select id from auth.users where email = '${email ?? "YOUR-EMAIL"}';`}
      </pre>
      <button type="button" onClick={onLogOut} className="min-h-11 w-full rounded-full border border-line text-sm font-semibold">
        Log out
      </button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
function Inbox({
  email,
  onLogOut,
  theme,
  onToggleTheme,
}: {
  email: string | null;
  onLogOut: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [list, setList] = useState<Req[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [pricing, setPricing] = useState<Pricing>(DEFAULT_PRICING);
  const unreadBefore = useRef(0);

  const loadList = useCallback(async () => {
    const { data, error } = await adminDb().from("shor_requests").select(FIELDS).order("updated_at", { ascending: false }).limit(150);
    if (error) return console.error("Inbox load failed:", error.message);
    const rows = (data ?? []) as Req[];
    setList(rows);
    const n = rows.filter(unread).length;
    if (n > unreadBefore.current) ding();
    unreadBefore.current = n;
    document.title = n ? `(${n}) ${BRAND} admin` : `${BRAND} admin`;
  }, []);

  useEffect(() => {
    void loadList();
    const t = setInterval(() => void loadList(), 5000);
    void adminDb()
      .from("settings")
      .select("value")
      .eq("key", "shor_pricing")
      .maybeSingle()
      .then(({ data }) => {
        const p = (data?.value ?? {}) as Record<string, unknown>;
        setPricing({
          faresKobo: Array.isArray(p.fares_kobo) ? (p.fares_kobo as number[]).map(Number).filter((n) => n > 0) : DEFAULT_PRICING.faresKobo,
          lateKobo: Number(p.late_night_kobo) || DEFAULT_PRICING.lateKobo,
          bulkyKobo: Number(p.bulky_kobo) || DEFAULT_PRICING.bulkyKobo,
          commissionKobo: Number(p.commission_kobo) || DEFAULT_PRICING.commissionKobo,
        });
      });
    return () => clearInterval(t);
  }, [loadList]);

  const shown = list.filter((r) => filter === "all" || !["delivered", "cancelled"].includes(r.status));

  return (
    <div className="flex h-dvh w-full min-w-0">
      <aside className={`w-full shrink-0 flex-col border-r border-line md:flex md:w-80 ${openId ? "hidden" : "flex"}`}>
        <div className="border-b border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <LogoMark size={32} />
              <span className="truncate text-lg font-bold">Requests</span>
            </span>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-sm">
            <span className="flex gap-2">
              {(["open", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`min-h-9 rounded-full px-3 ${filter === f ? "bg-snow font-semibold text-night" : "bg-panel"}`}
                >
                  {f === "open" ? "Open" : "All"}
                </button>
              ))}
            </span>
            <button type="button" onClick={onLogOut} title={email ?? undefined} className="min-h-9 px-2 text-xs text-mute hover:text-snow">
              Log out
            </button>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {shown.length === 0 && <li className="p-6 text-center text-sm text-mute">No requests yet. They&apos;ll appear here with a ding.</li>}
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left hover:bg-panel ${openId === r.id ? "bg-panel" : ""}`}
              >
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${unread(r) ? "bg-accent" : "bg-transparent"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{r.customer_name || "New customer"}</span>
                    <span className="shrink-0 text-xs text-mute">{time(r.updated_at)}</span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-mute">{r.code}</span>
                    {r.area && <span className="text-mute">· {r.area}</span>}
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
          <div className="m-auto text-sm text-mute">Choose a request on the left.</div>
        )}
      </section>
    </div>
  );
}

function Conversation({ id, pricing, onBack, onChanged }: { id: string; pricing: Pricing; onBack: () => void; onChanged: () => void }) {
  const [req, setReq] = useState<Req | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBill, setShowBill] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const lastId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const db = adminDb();

  const seen = useCallback(async () => {
    await adminDb().rpc("shor_team_seen", { p_request: id });
    onChanged();
  }, [id, onChanged]);

  const load = useCallback(async () => {
    const [{ data: r }, { data: m }, { data: d }] = await Promise.all([
      adminDb().from("shor_requests").select(FIELDS).eq("id", id).maybeSingle(),
      adminDb()
        .from("shor_messages")
        .select("id, sender, kind, body, data, deleted_at, created_at")
        .eq("request_id", id)
        .gt("id", lastId.current)
        .order("id")
        .limit(500),
      // Messages the customer has deleted since (their words are already wiped).
      adminDb().from("shor_messages").select("id").eq("request_id", id).not("deleted_at", "is", null),
    ]);
    if (r) setReq(r as Req);
    const fresh = (m ?? []) as Msg[];
    const gone = new Set(((d ?? []) as { id: number }[]).map((x) => x.id));
    setMessages((old) =>
      [...old, ...fresh.filter((x) => !old.some((y) => y.id === x.id))].map((x) =>
        gone.has(x.id) ? { ...x, body: "", deleted_at: x.deleted_at ?? "deleted" } : x,
      ),
    );
    if (fresh.length) {
      lastId.current = fresh[fresh.length - 1].id;
      if (fresh.some((x) => x.sender === "customer")) await seen();
    }
  }, [id, seen]);

  useEffect(() => {
    void load();
    void seen();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load, seen]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>, failText: string) {
    setBusy(true);
    setError(null);
    const { error } = await action();
    if (error) {
      console.error(failText, error.message);
      setError(failText);
    }
    await load();
    onChanged();
    setBusy(false);
    return !error;
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    if (await run(() => db.rpc("shor_team_send", { p_request: id, p_body: body }), "Message not sent. Please try again.")) setText("");
  }

  const status = (s: "paid" | "on_the_way" | "delivered" | "cancelled") => {
    setConfirmCancel(false);
    void run(() => db.rpc("shor_team_status", { p_request: id, p_status: s }), "That didn't go through. Please try again.");
  };

  async function openReceipt(receiptId: number) {
    const { data, error } = await db.from("shor_receipts").select("image").eq("id", receiptId).maybeSingle();
    if (error || !data) return setError("Couldn't load that receipt. Please try again.");
    setReceipt((data as { image: string }).image);
  }

  if (!req) return <div className="m-auto text-sm text-mute">Loading…</div>;

  const waNumber = req.phone ? `234${req.phone.replace(/\D/g, "").replace(/^0/, "")}` : null;
  const forPlug = [
    `${BRAND} request ${req.code}`,
    req.customer_name && `Customer: ${req.customer_name}`,
    req.phone && `Phone: ${req.phone}`,
    req.address && `Address: ${req.address}${req.area ? ` (${req.area})` : ""}`,
    req.quote && `Items: ${req.quote.items.map((i) => `${i.label} (${formatNaira(i.amount_kobo)})`).join("; ")}`,
    req.quote && `Customer paid: ${formatNaira(req.quote.total_kobo)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const pill = "min-h-10 rounded-full px-3 text-sm font-semibold";
  const open = !["delivered", "cancelled"].includes(req.status);

  return (
    <>
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back to requests" className="flex h-10 w-10 items-center justify-center rounded-full text-xl md:hidden">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {req.customer_name || "New customer"} <span className="font-normal text-mute">· {req.code}</span>
          </p>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[req.status]?.tone ?? ""}`}>
            {STATUS[req.status]?.label ?? req.status}
          </span>
        </div>
        {req.phone && (
          <a href={`tel:${req.phone}`} className={`${pill} flex items-center border border-line`}>
            Call
          </a>
        )}
        {waNumber && (
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className={`${pill} flex items-center border border-line`}>
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
          className={`${pill} bg-snow text-night`}
        >
          {copied ? "Copied ✓" : "Copy for plug"}
        </button>
      </header>

      {(req.phone || req.address) && (
        <div className="border-b border-line px-4 py-2 text-sm">
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
            if (m.deleted_at) {
              return (
                <p key={m.id} className="max-w-[80%] rounded-2xl border border-line px-3.5 py-2 text-sm italic text-mute">
                  🗑 Customer deleted a message
                </p>
              );
            }
            if (m.kind === "status") {
              return (
                <p key={m.id} className="mx-auto rounded-full bg-panel px-3 py-1 text-xs">
                  {m.body}
                </p>
              );
            }
            const mine = m.sender === "team";
            return (
              <div key={m.id} className={`max-w-[80%] ${mine ? "ml-auto text-right" : ""}`}>
                <p
                  className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-[15px] ${
                    mine ? "bg-accent text-night" : "bg-panel"
                  }`}
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
                    onClick={() => openReceipt(m.data?.receipt_id as number)}
                    className="mt-1 block min-h-9 rounded-full bg-purple-600 px-3 text-sm font-semibold text-white"
                  >
                    🧾 View receipt
                  </button>
                )}
                <p className="mt-0.5 text-[11px] text-mute">{time(m.created_at)}</p>
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
          <button type="button" onClick={() => setReceipt(null)} className="min-h-11 rounded-full bg-white px-5 font-semibold text-black">
            Close
          </button>
        </div>
      )}

      <div className="border-t border-line px-3 pt-3">
        {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="mb-2 flex flex-wrap gap-2">
          {!req.phone && open && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => db.rpc("shor_team_ask_details", { p_request: id }), "That didn't go through. Please try again.")}
              className={`${pill} border border-line`}
            >
              📋 Ask for delivery details
            </button>
          )}
          {open && (
            <button type="button" onClick={() => setShowBill((s) => !s)} className={`${pill} border border-accent text-accent`}>
              {showBill ? "Hide bill" : req.quote ? "Send a new bill" : "Send bill"}
            </button>
          )}
          {["quoted", "payment_claimed"].includes(req.status) && (
            <button type="button" disabled={busy} onClick={() => status("paid")} className={`${pill} bg-accent text-night`}>
              ✓ Payment received
            </button>
          )}
          {req.status === "paid" && (
            <button type="button" disabled={busy} onClick={() => status("on_the_way")} className={`${pill} bg-accent text-night`}>
              Plug is on the way
            </button>
          )}
          {req.status === "on_the_way" && (
            <button type="button" disabled={busy} onClick={() => status("delivered")} className={`${pill} bg-accent text-night`}>
              Delivered
            </button>
          )}
          {open &&
            (confirmCancel ? (
              <button type="button" disabled={busy} onClick={() => status("cancelled")} className={`${pill} bg-red-600 text-white`}>
                Tap again to cancel
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)} className={`${pill} text-mute`}>
                Cancel request
              </button>
            ))}
        </div>

        {showBill && (
          <BillBuilder
            pricing={pricing}
            busy={busy}
            onSend={async (b) => {
              const ok = await run(
                () => db.rpc("shor_team_quote", { p_request: id, p_items: b.items, p_fare_kobo: b.fareKobo, p_late: b.late, p_bulky: b.bulky }),
                "The bill wasn't sent. Please try again.",
              );
              if (ok) setShowBill(false);
            }}
          />
        )}

        <form onSubmit={send} className="flex gap-2 pb-4">
          <label htmlFor="admin-reply" className="sr-only">
            Reply
          </label>
          <input
            id="admin-reply"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Reply as ${BRAND}…`}
            className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-night px-4 text-base placeholder:text-mute focus:border-accent focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className="min-h-12 rounded-full bg-accent px-5 font-bold text-night disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </>
  );
}

function BillBuilder({
  pricing,
  busy,
  onSend,
}: {
  pricing: Pricing;
  busy: boolean;
  onSend: (b: { items: { label: string; amount_kobo: number }[]; fareKobo: number; late: boolean; bulky: boolean }) => void;
}) {
  const now = lagosNow();
  const [items, setItems] = useState([{ label: "", naira: "" }]);
  const [fare, setFare] = useState("");
  const [late, setLate] = useState(now.minute >= 22 * 60 || now.minute < 6 * 60); // ticked automatically 10pm – 6am
  const [bulky, setBulky] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const naira = (s: string) => Math.max(0, Number(String(s).replace(/[,\s₦]/g, "")) || 0);
  const lines = items.map((i) => ({ label: i.label.trim().slice(0, 120), amount_kobo: Math.round(naira(i.naira) * 100) })).filter((i) => i.label && i.amount_kobo > 0);
  const itemsKobo = lines.reduce((s, i) => s + i.amount_kobo, 0);
  const fareKobo = Math.round(naira(fare) * 100);
  const extras = (late ? pricing.lateKobo : 0) + (bulky ? pricing.bulkyKobo : 0);
  const total = itemsKobo + fareKobo + extras;
  const plugGets = Math.max(0, fareKobo + extras - pricing.commissionKobo);
  const input = "min-h-11 rounded-xl border border-line bg-night px-3 text-base placeholder:text-mute focus:border-accent focus:outline-none";

  function submit() {
    if (lines.length === 0) return setError("Add at least one item with its price.");
    if (!fareKobo) return setError("Choose the transport fare.");
    setError(null);
    onSend({ items: lines, fareKobo, late, bulky });
  }

  return (
    <div className="mb-3 space-y-3 rounded-2xl border border-line bg-panel p-3">
      <p className="text-sm font-semibold">Items (what the plug will buy)</p>
      {items.map((it, i) => (
        <div key={i} className="flex gap-2">
          <input
            aria-label={`Item ${i + 1}`}
            placeholder="e.g. 4 Black Bullet"
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
            <button type="button" aria-label="Remove item" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} className="px-2 text-mute">
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => setItems((l) => [...l, { label: "", naira: "" }])} className="text-sm font-semibold text-accent">
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
              className={`min-h-10 rounded-full border px-3 text-sm ${fareKobo === k ? "border-accent bg-accent text-night" : "border-line bg-night"}`}
            >
              {formatNaira(k)}
            </button>
          ))}
          <input aria-label="Other fare in naira" placeholder="Other ₦" inputMode="numeric" value={fare} onChange={(e) => setFare(e.target.value)} className={`${input} w-28`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5">
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[#FF7A1A]" checked={late} onChange={(e) => setLate(e.target.checked)} />
          Late night (+{formatNaira(pricing.lateKobo)})
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-[#FF7A1A]" checked={bulky} onChange={(e) => setBulky(e.target.checked)} />
          10+ large items (+{formatNaira(pricing.bulkyKobo)})
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-night px-3 py-2">
        <span className="text-sm text-mute">
          Customer pays <strong className="text-base text-snow">{formatNaira(total)}</strong>
        </span>
        <span className="text-xs text-mute">
          Plug gets {formatNaira(plugGets)} · {BRAND} {formatNaira(pricing.commissionKobo)}
        </span>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="button" disabled={busy} onClick={submit} className={primary}>
        Send bill to customer
      </button>
    </div>
  );
}
