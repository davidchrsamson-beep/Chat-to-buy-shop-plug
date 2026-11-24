import Link from "next/link";
import type { ReactNode } from "react";
import ShopPlugMark from "@/components/market/ShopPlugMark";

// The simple frame around sign-up, login and password screens (as in the current site).
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
        <Link href="/" className="w-28 text-sm text-gray-500 hover:text-ink">‹ Back to Home</Link>
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold">
          <ShopPlugMark size={28} /> Shop Plug
        </Link>
        <span className="w-28" aria-hidden="true" />
      </header>
      <main className="mx-auto max-w-md px-5 pb-16">{children}</main>
    </div>
  );
}