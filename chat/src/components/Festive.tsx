// errand's Christmas Edition touches: a string of twinkling lights across the top,
// a "Christmas Edition" badge, and (on wide screens) hanging baubles and the words
// "Christmas Edition" lettered down the side. Purely decoration: screen readers skip it,
// it never blocks taps, and it stays still for people who turn animations off.
// Switch it off after the season in lib/season.ts.

const BULBS = ["#FF7A1A", "#FFC94A", "#FF4D4D", "#3DDC84", "#FFF1D6"];

const STYLES = `
@keyframes errand-twinkle { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes errand-swing { 0%,100% { transform: rotate(4deg); } 50% { transform: rotate(-4deg); } }
@keyframes errand-glow { 0%,100% { opacity: .55; } 50% { opacity: .85; } }
.errand-twinkle { animation: errand-twinkle 1.8s ease-in-out infinite; }
.errand-swing { transform-origin: top center; animation: errand-swing 4.5s ease-in-out infinite; }
.errand-glow { animation: errand-glow 3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .errand-twinkle, .errand-swing, .errand-glow { animation: none; }
}
`;

export function ChristmasBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-[#FFC94A]/50 bg-[#FFC94A]/10 font-bold uppercase text-[#FFC94A] ${
        small ? "px-2 py-0.5 text-[9px] tracking-[0.18em]" : "px-2.5 py-1 text-[10px] tracking-[0.22em]"
      }`}
      style={{ textShadow: "0 0 8px rgba(255,201,74,.55)" }}
    >
      ✦ Christmas Edition
    </span>
  );
}

export function FestiveBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <style>{STYLES}</style>

      {/* Warm glow behind everything, like lights through a window */}
      <div
        className="errand-glow absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(255,122,26,.18), rgba(255,77,77,.06), transparent)" }}
      />

      {/* String of lights across the top */}
      <svg className="absolute inset-x-0 top-0 h-7 w-full" preserveAspectRatio="none" viewBox="0 0 100 10">
        <path d="M0 2 Q 12.5 8 25 2 T 50 2 T 75 2 T 100 2" fill="none" stroke="#3a3b40" strokeWidth="0.4" />
      </svg>
      <div className="absolute inset-x-0 top-0 flex justify-between px-2">
        {Array.from({ length: 30 }, (_, i) => {
          const colour = BULBS[i % BULBS.length];
          const sag = Math.sin(((i % 8) / 8) * Math.PI) * 10; // follows the string's curve
          return (
            <span
              key={i}
              className="errand-twinkle block h-2 w-2 rounded-full"
              style={{
                marginTop: 4 + sag,
                background: colour,
                boxShadow: `0 0 8px 2px ${colour}`,
                animationDelay: `${(i % 6) * 0.3}s`,
              }}
            />
          );
        })}
      </div>

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
            WebkitTextStroke: "1px rgba(255,201,74,.55)",
            textShadow: "0 0 24px rgba(255,122,26,.25)",
          }}
        >
          Christmas Edition
        </p>
        <span className="errand-twinkle absolute -left-3 top-0 text-xl text-[#FFC94A]">✦</span>
        <span className="errand-twinkle absolute -right-2 bottom-6 text-sm text-[#FF7A1A]" style={{ animationDelay: ".9s" }}>✦</span>
      </div>
    </div>
  );
}

function Bauble({ length, colour, delay, size = 38 }: { length: number; colour: string; delay: number; size?: number }) {
  return (
    <div className="errand-swing flex flex-col items-center" style={{ animationDelay: `${delay}s` }}>
      <span className="block w-px bg-[#55565c]" style={{ height: length }} />
      <span className="block h-2 w-3 rounded-sm bg-[#8a8b91]" />
      <span
        className="block rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 32% 30%, #fff8 0 8%, ${colour} 30%, #0008 100%)`,
          boxShadow: `0 0 22px ${colour}66`,
        }}
      />
    </div>
  );
}
