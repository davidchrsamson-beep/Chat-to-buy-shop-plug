import type { Metadata } from "next";
import AuthShell from "@/components/vendor/AuthShell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Vendor login — Ndu" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell>
      <div className="mt-6">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Log in to your vendor dashboard</p>
        {error === "link" && (
          <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            That link has expired or was already used. Please request a new one.
          </p>
        )}
        <LoginForm />
      </div>
    </AuthShell>
  );
}
