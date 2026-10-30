"use client";

import Link from "next/link";
import { useActionState } from "react";
import AuthShell from "@/components/vendor/AuthShell";
import { Field } from "@/components/ui/fields";
import { requestPasswordReset, type FormState } from "../actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});

  return (
    <AuthShell>
      <div className="mt-6">
        <h1 className="text-2xl font-bold">Reset your password</h1>
        {state.sent ? (
          <div className="mt-6 rounded-2xl bg-brand-tint p-5 text-sm text-gray-700">
            <p className="font-semibold text-brand-dark">Check your email</p>
            <p className="mt-1">
              If <strong>{state.email}</strong> has an Ndu store, we&apos;ve sent a link to reset the password. It works once
              and expires in 1 hour.
            </p>
          </div>
        ) : (
          <form action={formAction} noValidate className="mt-6 space-y-4">
            <p className="text-sm text-gray-500">Enter the email you signed up with. We&apos;ll send you a reset link.</p>
            <Field label="Email address" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
            {state.error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link href="/vendor/login" className="font-semibold text-brand">Back to login</Link>
        </p>
      </div>
    </AuthShell>
  );
}
