import LightString from "@/components/ui/LightString";
import Marquee from "@/components/ui/Marquee";

// The storefront entrance. When a buyer arrives:
// 1. Two doors ("Wel" | "come") slide open.
// 2. The photo slowly settles into place.
// 3. The store's name rises in, its letters closing together.
// The announcement and the store's moving line travel across the top; "Explore collection" stays still.
export default function StoreHero({
  name,
  tagline,
  neighbourhood,
  verified,
  photo,
  announcement,
  christmas,
}: {
  name: string;
  tagline: string | null;
  neighbourhood: string | null;
  verified: boolean;
  photo: string | null;
  announcement: string | null;
  christmas: boolean;
}) {
  const delay = (s: number) => ({ animationDelay: `${s}s` });

  return (
    <section className="relative flex min-h-[72vh] items-end overflow-hidden bg-ink">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="ndu-settle absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/25" aria-hidden="true" />

      {announcement && (
        <Marquee text={announcement} speed={24} className="absolute inset-x-0 top-0 z-10 py-2 text-[11px]" />
      )}
      {christmas && <LightString className={`absolute inset-x-0 z-10 ${announcement ? "top-10" : "top-3"}`} />}

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-12 text-center text-white">
        {christmas && (
          <p
            className="ndu-rise inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] backdrop-blur"
            style={delay(1.1)}
          >
            ✦ Christmas Edition ✦
          </p>
        )}
        {neighbourhood && (
          <p className="ndu-rise mt-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80" style={delay(1.2)}>
            {neighbourhood} · Calabar
          </p>
        )}
        <h1 className="ndu-rise mt-3 font-serif text-5xl font-bold leading-none sm:text-6xl" style={delay(1.3)}>
          {name}
        </h1>
        {tagline && (
          <p className="ndu-rise mt-3 font-serif text-lg italic text-white/90" style={delay(1.55)}>
            “{tagline}”
          </p>
        )}
        {verified && (
          <p
            className="ndu-rise mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur"
            style={delay(1.7)}
          >
            ✓ Verified by Shop Plug
          </p>
        )}
        <div className="ndu-rise mt-7 flex justify-center" style={delay(1.85)}>
          <a
            href="#collection"
            aria-label="Explore collection"
            className="flex h-12 w-64 items-center justify-center rounded-full border border-white/70 text-xs font-semibold uppercase tracking-[0.25em] transition hover:bg-white/10"
          >
            Explore collection
          </a>
        </div>
      </div>

      {/* The doors: closed when the buyer arrives, then slide open */}
      <div
        aria-hidden="true"
        className="ndu-door-left absolute inset-y-0 left-0 z-20 flex w-1/2 items-center justify-end border-r border-white/10 bg-ink pr-1"
      >
        <span className="font-serif text-4xl font-bold text-white/90 sm:text-5xl">Wel</span>
      </div>
      <div
        aria-hidden="true"
        className="ndu-door-right absolute inset-y-0 right-0 z-20 flex w-1/2 items-center justify-start border-l border-white/10 bg-ink pl-1"
      >
        <span className="font-serif text-4xl font-bold text-white/90 sm:text-5xl">come</span>
      </div>
    </section>
  );
}
