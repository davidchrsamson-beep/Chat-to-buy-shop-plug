import Link from "next/link";
import { FIND_A_PLUG_URL } from "@/lib/urls";
import ShopPlugMark from "./ShopPlugMark";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <Link href="/" aria-label="Shop Plug home" className="flex shrink-0 items-center gap-2 font-serif text-lg font-bold tracking-tight sm:text-2xl">
          <ShopPlugMark size={34} />
          <span>Shop Plug</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-4">
          <a href={FIND_A_PLUG_URL} className="whitespace-nowrap text-xs font-semibold text-gray-700 hover:text-ink sm:text-sm">
            Find a Plug
          </a>
          <Link href="/vendor/login" className="hidden whitespace-nowrap text-sm font-medium text-gray-600 hover:text-ink sm:inline-flex">
            Vendor Login
          </Link>
          <Link href="/vendor/signup" aria-label="Sell on Shop Plug" className="whitespace-nowrap rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 sm:px-4 sm:text-sm">
            <span className="sm:hidden">Sell</span>
            <span className="hidden sm:inline">Sell on Shop Plug</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}