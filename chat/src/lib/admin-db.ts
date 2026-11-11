"use client";

import { createClient } from "@supabase/supabase-js";

// The Shop Plug admin's connection to the database, logged in as a team member.
// The login is remembered on this device only. Everything the admin can read or change is
// still checked by the database (only accounts on the team list get anything).
let client: ReturnType<typeof createClient> | null = null;

export function adminDb() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "shopplug-admin" },
    });
  }
  return client;
}
