import Link from "next/link";

// Shown instead of a team page when something is missing, with exactly what to do.
export default function TeamGate({ state, email }: { state: "setup" | "not_team"; email: string | null }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      {state === "setup" ? (
        <>
          <h1 className="text-xl font-bold">The Shop Plug team pages aren&apos;t set up yet</h1>
          <p className="mt-2 text-sm text-gray-600">
            In Supabase → SQL Editor, run the Shop Plug SQL files (they start with <code>20261105</code>), then refresh this page.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-bold">This page is for the Shop Plug team</h1>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;re logged in as <strong>{email ?? "this account"}</strong>, which isn&apos;t on the team list yet. In Supabase → SQL
            Editor, run this, then refresh this page:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-900 p-4 text-xs text-white">
{`insert into public.team_members (user_id)
select id from auth.users where email = '${email ?? "YOUR-LOGIN-EMAIL"}';`}
          </pre>
        </>
      )}
      <Link href="/vendor/dashboard" className="mt-6 inline-block text-sm font-semibold text-brand">
        Go to my vendor dashboard
      </Link>
    </main>
  );
}
