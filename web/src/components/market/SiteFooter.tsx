import Link from "next/link";
import { FIND_A_PLUG_URL } from "@/lib/urls";
import ShopPlugMark from "@chat/components/ShopPlugMark";

export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-gray-100 bg-gray-50 px-5 py-10 text-center">
      <p className="flex items-center justify-center gap-2 font-serif text-xl font-bold">
        <ShopPlugMark size={28} /> Shop Plug
      </p>
      <p className="mt-1 text-xs text-gray-400">Calabar&apos;s vendor marketplace · Life, delivered.</p>
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <a href={FIND_A_PLUG_URL} className="font-semibold text-brand">Find a Plug</a>
        <Link href="/vendor/signup" className="font-semibold text-brand">Sign up as a Vendor</Link>
        <Link href="/vendor/login" className="text-gray-600">Vendor Login</Link>
      </div>
      <p className="mt-6 text-[11px] text-gray-400">© {new Date().getFullYear()} Shop Plug</p>
    </footer>
  );
}