"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_PATTERN, passwordProblem } from "@/lib/validation";

export type FormState = { error?: string; email?: string; sent?: boolean };

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_PATTERN.test(email) || !password) {
    return { error: "Enter your email and password.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return { error: "Too many attempts. Please wait a few minutes and try again.", email };
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for our link.", email };
    }
    // One message for wrong email OR wrong password, so nobody can test which emails have accounts.
    return { error: "Email or password is incorrect.", email };
  }
  redirect("/vendor/dashboard");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error?.status === 429) return { error: "Too many requests. Please wait a few minutes and try again.", email };
  if (error) console.error("Password reset request failed:", error.code, error.message);

  // Same answer whether or not the account exists (protects vendors' privacy).
  return { sent: true, email };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const problem = passwordProblem(password) ?? (password !== confirm ? "Passwords do not match." : null);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Choose a password you haven't used before." };
    return { error: "Your reset link has expired. Please request a new one." };
  }
  redirect("/vendor/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/vendor/login");
}

// Logs the vendor out on every phone and computer, e.g. after losing a phone.
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/vendor/login");
}
