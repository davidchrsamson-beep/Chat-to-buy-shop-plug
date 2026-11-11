"use server";

import { db } from "@/lib/supabase";

// Shop Plug requests: the customer's side of the chat with the team.
// Every call carries the customer's secret code (kept only on their phone);
// the database checks it before showing or changing anything.

export type Quote = {
  items: { label: string; amount_kobo: number }[];
  items_kobo: number;
  fare_kobo: number;
  late_kobo: number;
  bulky_kobo: number;
  total_kobo: number;
  sent_at: string;
};

export type PlugMessage = {
  id: number;
  sender: "customer" | "team";
  kind: "text" | "quote" | "paid" | "status" | "ask_details";
  body: string;
  data: Quote | null;
  at: string;
};

export type RequestState = {
  code: string;
  status: "new" | "quoted" | "payment_claimed" | "paid" | "on_the_way" | "delivered" | "cancelled";
  has_details: boolean;
  phone: string | null;
  quote: Quote | null;
  bank: { bank: string; account_name: string; account_number: string } | null;
  messages: PlugMessage[];
};

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };

const validToken = (t: unknown): t is string => typeof t === "string" && /^[a-f0-9]{64}$/.test(t);
const validId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);

export async function startRequest(token: string): Promise<Ok<{ id: string; code: string }> | Fail> {
  if (!validToken(token)) return { ok: false, error: "Please refresh the page and try again." };
  const { data, error } = await db().rpc("shor_start", { p_token: token });
  if (error) {
    console.error("Request start failed:", error.code, error.message);
    return {
      ok: false,
      error: error.message.includes("busy") ? "Lots of requests right now. Please try again in a minute." : "We couldn't start your request. Please try again.",
    };
  }
  return { ok: true, id: data.id as string, code: data.code as string };
}

export async function sendMessage(id: string, token: string, body: string): Promise<Ok<object> | Fail> {
  const text = String(body ?? "").trim().slice(0, 2000);
  if (!validId(id) || !validToken(token) || !text) return { ok: false, error: "Message not sent. Please try again." };
  const { error } = await db().rpc("shor_send", { p_request: id, p_token: token, p_body: text });
  if (error) {
    console.error("Message send failed:", error.code, error.message);
    return {
      ok: false,
      error: error.message.includes("slow down") ? "You're sending messages very fast. Give it a moment." : "Message not sent. Please try again.",
    };
  }
  return { ok: true };
}

// Nigerian numbers: 08012345678, +2348012345678, 2348012345678 -> 08012345678
function normalisePhone(raw: string): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (/^0[789][01]\d{8}$/.test(d)) return d;
  if (/^234[789][01]\d{8}$/.test(d)) return `0${d.slice(3)}`;
  return null;
}

export async function saveDetails(
  id: string,
  token: string,
  details: { name: string; phone: string; address: string; area: string },
): Promise<Ok<object> | Fail> {
  if (!validId(id) || !validToken(token)) return { ok: false, error: "Please refresh the page and try again." };
  const name = String(details?.name ?? "").trim().slice(0, 80);
  const phone = normalisePhone(details?.phone);
  const address = String(details?.address ?? "").trim().slice(0, 300);
  const area = String(details?.area ?? "").trim().slice(0, 40);
  if (!name) return { ok: false, error: "Please add your name." };
  if (!phone) return { ok: false, error: "Please enter a Nigerian phone number, e.g. 08012345678." };
  if (address.length < 6) return { ok: false, error: "Please add your delivery address (street and a landmark helps)." };

  const { error } = await db().rpc("shor_save_details", {
    p_request: id,
    p_token: token,
    p_name: name,
    p_phone: phone,
    p_address: address,
    p_area: area,
  });
  if (error) {
    console.error("Details save failed:", error.code, error.message);
    return { ok: false, error: "We couldn't save your details. Please try again." };
  }
  return { ok: true };
}

export async function pollRequest(id: string, token: string, after: number): Promise<RequestState | null> {
  if (!validId(id) || !validToken(token)) return null;
  const { data, error } = await db().rpc("shor_poll", {
    p_request: id,
    p_token: token,
    p_after: Number.isInteger(after) && after > 0 ? after : 0,
  });
  if (error) {
    console.error("Request poll failed:", error.code, error.message);
    return null;
  }
  return (data ?? null) as RequestState | null;
}

// "I've paid" with a photo or screenshot of the transfer receipt (shrunk on the phone first).
export async function markPaid(id: string, token: string, receipt: string): Promise<Ok<object> | Fail> {
  if (!validId(id) || !validToken(token)) return { ok: false, error: "Please refresh the page and try again." };
  if (typeof receipt !== "string" || !receipt.startsWith("data:image/jpeg;base64,") || receipt.length > 900_000) {
    return { ok: false, error: "Please add a clear photo or screenshot of your receipt." };
  }
  const { error } = await db().rpc("shor_mark_paid", { p_request: id, p_token: token, p_receipt: receipt });
  if (error) {
    console.error("Mark paid failed:", error.code, error.message);
    return {
      ok: false,
      error: error.message.includes("too many") ? "You've sent several receipts already. Message your plug instead." : "Your receipt didn't send. Please try again.",
    };
  }
  return { ok: true };
}
