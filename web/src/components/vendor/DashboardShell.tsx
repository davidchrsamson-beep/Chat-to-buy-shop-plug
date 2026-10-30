import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/vendor/actions";

const TABS = [
  { key: "overview", label: "Overview", href: "/vendor/dashboard" },
  { key: "products", label: "Products", href: "/vendor/products" },
  { key: "settings", label: "Store settings", href: "/vendor/settings" },
  { key: "listing", label: "Listing", href: "/vendor/listing" },
] as const;

export type DashboardTab = (typeof TABS)[number]["key"];

// The frame around every vendor page: logo, store name, tabs, log out.
export default function DashboardShell({
  active,
  storeName,
  children,
}: {
  active: DashboardTab;
  storeName: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-4">
          <div className="min-w-0">
            <span className="font-serif text-xl font-bold">
              Ndu<span className="text-brand">.</span>
            </span>
            <p className="truncate text-xs text-gray-500">{storeName}</p>
          </div>
          <form action={signOut}>
            <button className="min-h-11 px-2 text-sm text-gray-500 hover:text-ink">Log out</button>
          </form>
        </div>
        <nav aria-label="Dashboard" className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3 pt-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active === t.key ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${
                active === t.key ? "border-brand text-ink" : "border-transparent text-gray-500 hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-6">{children}</main>
    </div>
  );
}
