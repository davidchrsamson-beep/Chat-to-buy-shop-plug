// The Shop Plug logo: "Plug Promise", two little fingers hooked together
// (also two linked loops: a connection you can hold), on Shop Plug orange.
// Used wherever the brand appears: the home header, the "Make a request" button,
// the chat header and the small avatar next to the team's messages.
// (The file keeps its old name, PlugFace, so every screen picks up the logo without other changes.)

const ORANGE = "#FF7A1A";
const INK = "#1C140F";

export function LogoMark({ size = 40, shape = "square" }: { size?: number; shape?: "square" | "circle" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Shop Plug">
      <rect width="200" height="200" rx={shape === "circle" ? 100 : 48} fill={ORANGE} />
      <g transform="translate(22 22) scale(0.78)" fill="none" strokeLinecap="round">
        {/* dark finger (back) */}
        <circle cx="112" cy="100" r="24" stroke={ORANGE} strokeWidth="30" />
        <path d="M129 83 C 140 68, 152 50, 164 34" stroke={ORANGE} strokeWidth="30" />
        <circle cx="112" cy="100" r="24" stroke={INK} strokeWidth="20" />
        <path d="M129 83 C 140 68, 152 50, 164 34" stroke={INK} strokeWidth="20" />
        {/* light finger (front) */}
        <circle cx="88" cy="100" r="24" stroke={ORANGE} strokeWidth="30" />
        <path d="M71 117 C 60 132, 48 150, 36 166" stroke={ORANGE} strokeWidth="30" />
        <circle cx="88" cy="100" r="24" stroke="#FFFFFF" strokeWidth="20" />
        <path d="M71 117 C 60 132, 48 150, 36 166" stroke="#FFFFFF" strokeWidth="20" />
        {/* where the dark finger passes over again: the two are locked together */}
        <path d="M114 124 A24 24 0 0 1 90 110" stroke={ORANGE} strokeWidth="30" strokeLinecap="butt" />
        <path d="M114 124 A24 24 0 0 1 90 110" stroke={INK} strokeWidth="20" strokeLinecap="butt" />
      </g>
    </svg>
  );
}

// Same props as before, so existing screens keep working: size, and an optional green "online" dot.
export default function PlugFace({ size = 40, online = false }: { size?: number; online?: boolean }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <LogoMark size={size} shape={size <= 32 ? "circle" : "square"} />
      {online && (
        <span
          aria-hidden="true"
          className="absolute -bottom-0.5 -right-0.5 block rounded-full border-2 border-night bg-[var(--ok)]"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </span>
  );
}
