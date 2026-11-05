"use server";

import { createClient } from "@/lib/supabase/server";

// The Shor plug team inbox. Only accounts listed in team_members can read or reply:
// the database checks this on every call, so these actions can't be misused by others.

export type InboxRequest = {
  id: string;
  code: string;
  customer_name: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  status: string;
  quote: {
    items: { label: string; amount_kobo: number }[];
    fare_kobo: number;
    late_kobo: number;
    bulky_kobo: number;
    total_kobo: number;
  } | null;
  last_customer_at: string | null;
  team_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InboxMessage = {
  id: number;
  sender: "customer" | "team";
  kind: "text" | "quote" | "paid" | "status" | "ask_details";
  body: string;
  data: { receipt_id?: number } | null;
  created_at: string;
};

type Result = { ok: true } | { ok: false; error: string };

const REQUEST_FIELDS =
  "id, code, customer_name, phone, address, area, status, quote, last_customer_at, team_seen_at, created_at, updated_at";
const isId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);

export async function listRequests(): Promise<InboxRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shor_requests")
    .select(REQUEST_FIELDS)
    .order("updated_at", { ascending: false })
    .limit(150);
  if (error) console.error("Inbox list failed:", error.code, error.message);
  return (data ?? []) as InboxRequest[];
}

export async function getConversation(id: string, after = 0): Promise<{ request: InboxRequest; messages: InboxMessage[] } | null> {
  if (!isId(id)) return null;
  const supabase = await createClient();
  const [{ data: request }, { data: messages, error }] = await Promise.all([
    supabase.from("shor_requests").select(REQUEST_FIELDS).eq("id", id).maybeSingle(),
    supabase
      .from("shor_messages")
      .select("id, sender, kind, body, data, created_at")
      .eq("request_id", id)
      .gt("id", Number.isInteger(after) ? after : 0)
      .order("id")
      .limit(500),
  ]);
  if (error) console.error("Conversation load failed:", error.code, error.message);
  if (!request) return null;
  return { request: request as InboxRequest, messages: (messages ?? []) as InboxMessage[] };
}

export async function reply(id: string, body: string): Promise<Result> {
  const text = String(body ?? "").trim().slice(0, 2000);
  if (!isId(id) || !text) return { ok: false, error: "Type a message first." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("shor_team_send", { p_request: id, p_body: text });
  if (error) {
    console.error("Team reply failed:", error.code, error.message);
    return { ok: false, error: "Message not sent. Please try again." };
  }
  return { ok: true };
}

export async function sendQuote(
  id: string,
  input: { items: { label: string; naira: string }[]; fareNaira: string; late: boolean; bulky: boolean },
): Promise<Result> {
  if (!isId(id)) return { ok: false, error: "Request not found." };
  const toKobo = (n: string) => {
    const v = Number(String(n ?? "").replace(/[,\s₦]/g, ""));
    return Number.isFinite(v) && v >= 0 && v <= 10_000_000 ? Math.round(v * 100) : null;
  };
  const items = (Array.isArray(input?.items) ? input.items : [])
    .map((it) => ({ label: String(it?.label ?? "").trim().slice(0, 120), amount_kobo: toKobo(it?.naira) }))
    .filter((it) => it.label && it.amount_kobo !== null);
  const fare = toKobo(input?.fareNaira);
  if (items.length === 0) return { ok: false, error: "Add at least one item with its price." };
  if (fare === null || fare === 0) return { ok: false, error: "Choose the transport fare." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("shor_team_quote", {
    p_request: id,
    p_items: items,
    p_fare_kobo: fare,
    p_late: Boolean(input.late),
    p_bulky: Boolean(input.bulky),
  });
  if (error) {
    console.error("Quote failed:", error.code, error.message);
    return { ok: false, error: "The bill wasn't sent. Please try again." };
  }
  return { ok: true };
}

export async function setStatus(id: string, status: "paid" | "on_the_way" | "delivered" | "cancelled"): Promise<Result> {
  if (!isId(id) || !["paid", "on_the_way", "delivered", "cancelled"].includes(status)) {
    return { ok: false, error: "Not allowed." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("shor_team_status", { p_request: id, p_status: status });
  if (error) {
    console.error("Status change failed:", error.code, error.message);
    return { ok: false, error: "That didn't go through. Please try again." };
  }
  return { ok: true };
}

// The customer's payment receipt picture (team only).
export async function getReceipt(receiptId: number): Promise<string | null> {
  if (!Number.isInteger(receiptId) || receiptId <= 0) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("shor_receipts").select("image").eq("id", receiptId).maybeSingle();
  if (error) console.error("Receipt load failed:", error.code, error.message);
  return (data?.image as string | undefined) ?? null;
}

// Sends the customer a small form in their chat for name, phone and delivery address.
export async function askDetails(id: string): Promise<Result> {
  if (!isId(id)) return { ok: false, error: "Request not found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("shor_team_ask_details", { p_request: id });
  if (error) {
    console.error("Ask details failed:", error.code, error.message);
    return { ok: false, error: "That didn't go through. Please try again." };
  }
  return { ok: true };
}

export async function markSeen(id: string): Promise<void> {
  if (!isId(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("shor_team_seen", { p_request: id });
  if (error) console.error("Mark seen failed:", error.code, error.message);
}
