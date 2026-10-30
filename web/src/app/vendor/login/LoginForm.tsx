"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, PasswordField } from "@/components/ui/fields";
import { logIn, type FormState } from "../actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(logIn, {});

  return (
    <form action={formAction} noValidate className="mt-6 space-y-4">
      <Field label="Email address" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      <PasswordField label="Password" name="password" autoComplete="current-password" required />

      {state.error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Login to Dashboard"}
      </button>

      <p className="text-center text-sm">
        <Link href="/vendor/forgot-password" className="font-semibold text-brand">Forgot password?</Link>
      </p>
      <p className="text-center text-sm text-gray-500">
        New vendor? <Link href="/vendor/signup" className="font-semibold text-brand">Create your free store</Link>
      </p>
    </form>
  );
}
