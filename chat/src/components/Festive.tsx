// errand's Christmas Edition touches: the "Christmas Edition" badge, and (on wide screens)
// hanging baubles and the words "Christmas Edition" lettered down the side.
// Purely decoration: screen readers skip it, it never blocks taps, and it stays still for
// people who turn animations off. Switch it off after the season in lib/season.ts.

const STYLES = `
@keyframes errand-swing { 0%,100% { transform: rotate(4deg); } 50% { transform: rotate(-4deg); } }
@keyframes errand-twinkle { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.errand-swing { transform-origin: top center; animation: errand-swing 4.5s ease-in-out infinite; }
.errand-twinkle { animation: errand-twinkle 1.8s ease-in-out infinite; }
.errand-glow { display: none; }
html[data-theme="dark"] .errand-glow { display: block; } /* the warm glow only suits the black look */
@media (prefers-reduced-motion: reduce) { .errand-swing, .errand-twinkle { animation: none; } }
`;

export function ChristmasBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
      style={{
        color: "var(--badge)",
        borderColor: "color-mix(in srgb, var(--badge) 50%, transparent)",
        background: "color-mix(in srgb, var(--badge) 10%, transparent)",
      }}
    >
      ✦ Christmas Edition
    </span>
  );
}

export function FestiveBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <style>{STYLES}</style>

      {/* Warm glow behind the headline (black look only) */}
      <div
        className="errand-glow absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(255,122,26,.18), rgba(255,77,77,.06), transparent)" }}
      />

      {/* Wide screens: baubles hanging on the left */}
      <div className="absolute left-[6%] top-0 hidden gap-10 min-[1100px]:flex">
        <Bauble length={120} colour="#FF4D4D" delay={0} />
        <Bauble length={210} colour="#FFC94A" delay={0.8} size={46} />
        <Bauble length={80} colour="#FF7A1A" delay={1.6} size={30} />
      </div>

      {/* Wide screens: "Christmas Edition" lettered down the right side */}
      <div className="absolute right-[5%] top-1/2 hidden -translate-y-1/2 min-[1100px]:block">
        <p
          className="font-serif text-6xl italic leading-none"
          style={{
            writingMode: "vertical-rl",
            color: "transparent",
            WebkitTextStroke: "1px color-mix(in srgb, var(--badge) 60%, transparent)",
          }}
        >
          Christmas Edition
        </p>
        <span className="errand-twinkle absolute -left-3 top-0 text-xl" style={{ color: "var(--badge)" }}>✦</span>
        <span className="errand-twinkle absolute -right-2 bottom-6 text-sm text-accent" style={{ animationDelay: ".9s" }}>✦</span>
      </div>
    </div>
  );
}

function Bauble({ length, colour, delay, size = 38 }: { length: number; colour: string; delay: number; size?: number }) {
  return (
    <div className="errand-swing flex flex-col items-center" style={{ animationDelay: `${delay}s` }}>
      <span className="block w-px bg-line-strong" style={{ height: length }} />
      <span className="block h-2 w-3 rounded-sm bg-mute" />
      <span
        className="block rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 32% 30%, #fff8 0 8%, ${colour} 30%, #0006 100%)`,
          boxShadow: `0 0 22px ${colour}55`,
        }}
      />
    </div>
  );
}
