"use client";

import Link from "next/link";

// Shown if any vendor page fails unexpectedly, instead of a blank screen.
export default function VendorError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <h1 className="text-xl font-bold">Something didn&apos;t load</h1>
      <p className="mt-2 text-sm text-gray-600">This is usually a slow connection. Please try again.</p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white">
          Try again
        </button>
        <Link href="/vendor/dashboard" className="rounded-xl border border-gray-200 px-5 py-3 font-semibold">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
