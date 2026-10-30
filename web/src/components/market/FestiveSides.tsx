// Christmas decorations in the empty space beside the market on wide screens:
// swinging baubles on the left, a gold trumpet announcing the season's deals on the right.
// Purely decorative: hidden from screen readers, never clickable, and only on screens wide
// enough that they can't cover any products.

const BAUBLES = [
  { colour: "#ff5a5f", drop: 120, size: 30, delay: "0s" },
  { colour: "#ffd166", drop: 190, size: 24, delay: "0.6s" },
  { colour: "#06d6a0", drop: 150, size: 34, delay: "1.1s" },
];

export default function FestiveSides() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 hidden min-[1360px]:block">
      {/* Left: baubles hanging from the top */}
      <div className="absolute left-8 top-0 flex gap-6">
        {BAUBLES.map((b) => (
          <div key={b.colour} className="ndu-swing flex flex-col items-center" style={{ animationDelay: b.delay }}>
            <span className="block w-px bg-gray-300" style={{ height: b.drop }} />
            <span className="block h-2 w-3 rounded-sm bg-[#c9a227]" />
            <span
              className="block rounded-full"
              style={{
                width: b.size,
                height: b.size,
                background: `radial-gradient(circle at 30% 30%, #ffffffcc 0 12%, ${b.colour} 35%)`,
                boxShadow: `0 6px 14px ${b.colour}55`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Right: the trumpet, facing the products, with a burst every few seconds */}
      <div className="absolute right-6 top-[38%] flex flex-col items-center gap-2">
        <svg width="132" height="84" viewBox="0 0 132 84" style={{ transform: "scaleX(-1)" }}>
          <g className="ndu-toot">
            <rect x="4" y="38" width="12" height="8" rx="2" fill="#c9a227" />
            <rect x="16" y="39" width="52" height="6" rx="3" fill="#f5b700" />
            <rect x="30" y="29" width="5" height="10" rx="1.5" fill="#c9a227" />
            <rect x="39" y="29" width="5" height="10" rx="1.5" fill="#c9a227" />
            <rect x="48" y="29" width="5" height="10" rx="1.5" fill="#c9a227" />
            <path d="M68 38 L100 18 L100 66 L68 46 Z" fill="#f5b700" />
            <ellipse cx="100" cy="42" rx="5" ry="24" fill="#c9a227" />
          </g>
          <g className="ndu-burst" stroke="#f5b700" strokeWidth="3" strokeLinecap="round">
            <line x1="110" y1="42" x2="128" y2="42" />
            <line x1="108" y1="28" x2="122" y2="16" />
            <line x1="108" y1="56" x2="122" y2="68" />
            <circle cx="126" cy="30" r="2.5" fill="#ff5a5f" stroke="none" />
            <circle cx="124" cy="56" r="2.5" fill="#06d6a0" stroke="none" />
            <circle cx="118" cy="8" r="2" fill="#4cc9f0" stroke="none" />
          </g>
        </svg>
        <span className="rounded-full bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          <span className="text-led">✦</span> Season deals
        </span>
      </div>
    </div>
  );
}
