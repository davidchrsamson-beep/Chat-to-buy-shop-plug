"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// "Log out and open a new store": logs out on this device only, then back to sign-up.
export async function logOutForNewStore() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/vendor/signup");
}
