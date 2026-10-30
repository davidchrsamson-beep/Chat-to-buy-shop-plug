"use client";

import { useActionState } from "react";
import { PasswordField } from "@/components/ui/fields";
import { updatePassword, type FormState } from "../actions";

export default function ResetForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updatePassword, {});

  return (
    <form action={formAction} noValidate className="mt-6 space-y-4">
      <PasswordField label="New password" name="password" autoComplete="new-password" placeholder="Min. 8 characters" required />
      <PasswordField label="Confirm new password" name="confirmPassword" autoComplete="new-password" required />
      {state.error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
