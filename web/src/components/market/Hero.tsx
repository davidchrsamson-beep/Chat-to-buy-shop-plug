import LightString from "@/components/ui/LightString";
import { isChristmasEdition } from "@/lib/season";

export default function Hero() {
  const christmas = isChristmasEdition();

  return (
    <section className="relative mx-auto max-w-5xl px-5 pt-8 pb-6 text-center">
      {christmas && <LightString className="absolute inset-x-0 top-1" />}
      {christmas && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white">
          <span className="text-led">✦</span> Christmas Edition <span className="text-led">✦</span>
        </p>
      )}
      <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
        Calabar&apos;s finest vendors.<br />One place.
      </h1>
      <p className="mt-3 text-gray-600">
        Find any item from verified vendors in Calabar.<br />Order. Get delivered.
      </p>

      <form action="/search" method="get" role="search" className="mx-auto mt-6 max-w-md">
        <label htmlFor="q" className="sr-only">Search vendors</label>
        <div className="relative">
          <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">🔍</span>
          <input
            id="q"
            name="q"
            type="search"
            maxLength={100}
            placeholder="Ex: wig vendors under 30k"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-base placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <p className="mt-2 text-xs italic text-gray-400">Search products or vendor type, add your budget</p>
      </form>
    </section>
  );
}
