import { createClient } from "@/lib/supabase/server";

// Who may use the Shor plug team pages (inbox, photo strip).
//   "ok"        → a team member
//   "login"     → not logged in
//   "setup"     → the Shor plug SQL file hasn't been run in Supabase yet
//   "not_team"  → logged in, but not on the team list
export async function teamAccess() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { supabase, state: "login" as const, email: null };
  const email = (auth.claims.email as string | undefined) ?? null;
  const { data, error } = await supabase.rpc("is_team");
  if (error) {
    console.error("Team check failed:", error.code, error.message);
    return { supabase, state: "setup" as const, email };
  }
  return { supabase, state: data === true ? ("ok" as const) : ("not_team" as const), email };
}
