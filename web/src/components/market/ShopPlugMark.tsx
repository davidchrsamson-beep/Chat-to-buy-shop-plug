export default function ShopPlugMark({ size = 36 }: { size?: number }) {
  const orange = "#FF7A1A";
  const ink = "#1C140F";

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" className="shrink-0">
      <rect width="200" height="200" rx="48" fill={orange} />
      <g transform="translate(22 22) scale(0.78)" fill="none" strokeLinecap="round">
        <circle cx="112" cy="100" r="24" stroke={orange} strokeWidth="30" />
        <path d="M129 83 C 140 68, 152 50, 164 34" stroke={orange} strokeWidth="30" />
        <circle cx="112" cy="100" r="24" stroke={ink} strokeWidth="20" />
        <path d="M129 83 C 140 68, 152 50, 164 34" stroke={ink} strokeWidth="20" />
        <circle cx="88" cy="100" r="24" stroke={orange} strokeWidth="30" />
        <path d="M71 117 C 60 132, 48 150, 36 166" stroke={orange} strokeWidth="30" />
        <circle cx="88" cy="100" r="24" stroke="#FFFFFF" strokeWidth="20" />
        <path d="M71 117 C 60 132, 48 150, 36 166" stroke="#FFFFFF" strokeWidth="20" />
        <path d="M114 124 A24 24 0 0 1 90 110" stroke={orange} strokeWidth="30" strokeLinecap="butt" />
        <path d="M114 124 A24 24 0 0 1 90 110" stroke={ink} strokeWidth="20" strokeLinecap="butt" />
      </g>
    </svg>
  );
}