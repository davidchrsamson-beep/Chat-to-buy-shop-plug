"use server";

import { revalidatePath } from "next/cache";
import { mediaBase, presignPut } from "@/lib/r2";
import { teamAccess } from "@/lib/team";

// The Shop Plug home-screen photo strip. Only team members can change it:
// every action checks, and the database checks again.

export type StripItem = {
  id: string;
  item: string;
  area: string;
  when_text: string;
  ask: string;
  image_url: string;
  video_url: string | null;
  sort_order: number;
  active: boolean;
};

type Result = { ok: true } | { ok: false; error: string };
const isId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/.test(id);

async function team() {
  const access = await teamAccess();
  return access.state === "ok" ? access.supabase : null;
}

function fail(what: string, error: { code?: string; message: string }): Result {
  console.error(`Photo strip ${what} failed:`, error.code, error.message);
  return { ok: false, error: "That didn't save. Please try again." };
}

export async function listStrip(): Promise<StripItem[]> {
  const supabase = await team();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("shor_strip")
    .select("id, item, area, when_text, ask, image_url, video_url, sort_order, active")
    .order("sort_order");
  if (error) console.error("Photo strip list failed:", error.code, error.message);
  return (data ?? []) as StripItem[];
}

export async function saveStripItem(input: {
  id?: string;
  item: string;
  area: string;
  when_text: string;
  ask: string;
  image_url?: string;
}): Promise<Result> {
  const supabase = await team();
  if (!supabase) return { ok: false, error: "Not allowed." };
  const fields = {
    item: String(input?.item ?? "").trim().slice(0, 60),
    area: String(input?.area ?? "").trim().slice(0, 40),
    when_text: String(input?.when_text ?? "").trim().slice(0, 40),
    ask: String(input?.ask ?? "").trim().slice(0, 120),
  };
  if (!fields.item) return { ok: false, error: "Add what was delivered." };

  if (input.id) {
    if (!isId(input.id)) return { ok: false, error: "Card not found." };
    const { error } = await supabase.from("shor_strip").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", input.id);
    if (error) return fail("edit", error);
  } else {
    // New cards: only photos uploaded to our own storage.
    const image = String(input.image_url ?? "");
    if (!image.startsWith(`${mediaBase()}/shor/strip/`)) return { ok: false, error: "Add a photo first." };
    const { data: last } = await supabase.from("shor_strip").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    const next = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 10;
    const { error } = await supabase.from("shor_strip").insert({ ...fields, image_url: image, sort_order: next });
    if (error) return fail("add", error);
  }
  revalidatePath("/team/strip");
  return { ok: true };
}

// Saves the order shown on screen (first card first).
export async function reorderStrip(ids: string[]): Promise<Result> {
  const supabase = await team();
  if (!supabase) return { ok: false, error: "Not allowed." };
  const list = (Array.isArray(ids) ? ids : []).filter(isId).slice(0, 100);
  for (let i = 0; i < list.length; i++) {
    const { error } = await supabase.from("shor_strip").update({ sort_order: (i + 1) * 10 }).eq("id", list[i]);
    if (error) return fail("reorder", error);
  }
  return { ok: true };
}

export async function setStripActive(id: string, active: boolean): Promise<Result> {
  const supabase = await team();
  if (!supabase || !isId(id)) return { ok: false, error: "Not allowed." };
  const { error } = await supabase.from("shor_strip").update({ active: Boolean(active) }).eq("id", id);
  return error ? fail("show/hide", error) : { ok: true };
}

export async function deleteStripItem(id: string): Promise<Result> {
  const supabase = await team();
  if (!supabase || !isId(id)) return { ok: false, error: "Not allowed." };
  const { error } = await supabase.from("shor_strip").delete().eq("id", id);
  return error ? fail("delete", error) : { ok: true };
}

// A one-time link to upload one strip photo (valid 10 minutes), into Shop Plug's own folder.
export async function stripUploadTarget(): Promise<{ ok: true; uploadUrl: string; publicUrl: string } | { ok: false; error: string }> {
  if (!(await team())) return { ok: false, error: "Not allowed." };
  try {
    const key = `shor/strip/${crypto.randomUUID()}.jpg`;
    return { ok: true, uploadUrl: await presignPut(key, "image/jpeg"), publicUrl: `${mediaBase()}/${key}` };
  } catch (e) {
    console.error("Strip upload setup failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Photo uploads aren't working right now. Please try again shortly." };
  }
}
