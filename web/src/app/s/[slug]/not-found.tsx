import Link from "next/link";
import ShopPlugMark from "@chat/components/ShopPlugMark";

export default function StoreNotFound() {
  return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="flex items-center justify-center gap-2 font-serif text-2xl font-bold">
        <ShopPlugMark size={32} /> Shop Plug
      </p>
      <h1 className="mt-6 text-xl font-bold">We couldn&apos;t find that store</h1>
      <p className="mt-2 text-sm text-gray-600">The link may be mistyped, or the store has moved.</p>
      <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white">
        Browse the Shop Plug marketplace
      </Link>
    </div>
  );
}
