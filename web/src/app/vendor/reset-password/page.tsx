import Link from "next/link";
import AuthShell from "@/components/vendor/AuthShell";
import { createClient } from "@/lib/supabase/server";
import ResetForm from "./ResetForm";

// Reached from the email link (via /auth/confirm), which logs the vendor in for this one step.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return (
    <AuthShell>
      <div className="mt-6">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        {data?.claims ? (
          <ResetForm />
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            This reset link has expired.{" "}
            <Link href="/vendor/forgot-password" className="font-semibold text-brand">Request a new one</Link>.
          </p>
        )}
      </div>
    </AuthShell>
  );
}
