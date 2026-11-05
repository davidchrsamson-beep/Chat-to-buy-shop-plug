// The friendly face of Shor plug: a smiling runner in an orange cap.
// An original drawing, so the chat feels like a person, not a logo.
export default function PlugFace({ size = 40, online = false }: { size?: number; online?: boolean }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Your plug">
        <circle cx="32" cy="32" r="32" fill="#FFE3CC" />
        {/* neck and shirt */}
        <path d="M14 64c2-10 9-15 18-15s16 5 18 15z" fill="#FF7A1A" />
        <rect x="27.5" y="42" width="9" height="9" rx="3" fill="#7A4A2E" />
        {/* head */}
        <ellipse cx="32" cy="33" rx="14" ry="15" fill="#8A5636" />
        {/* ears */}
        <ellipse cx="18.3" cy="34" rx="2.6" ry="3.6" fill="#7A4A2E" />
        <ellipse cx="45.7" cy="34" rx="2.6" ry="3.6" fill="#7A4A2E" />
        {/* cap: crown, then brim */}
        <path d="M17.5 27c0-9 6.5-14.5 14.5-14.5S46.5 18 46.5 27z" fill="#FF7A1A" />
        <path d="M30 26.2h22c1.8 0 2.4 1.9 1 2.9-1.6 1.1-4.8 1.6-9 1.6H30z" fill="#E2620A" />
        <circle cx="32" cy="12.8" r="1.6" fill="#E2620A" />
        {/* eyes, eyebrows, cheeks, smile */}
        <ellipse cx="26.5" cy="34" rx="2" ry="2.3" fill="#1C1209" />
        <ellipse cx="37.5" cy="34" rx="2" ry="2.3" fill="#1C1209" />
        <circle cx="27.2" cy="33.2" r=".6" fill="#fff" />
        <circle cx="38.2" cy="33.2" r=".6" fill="#fff" />
        <path d="M23.5 30.2q3-1.6 6 0M34.5 30.2q3-1.6 6 0" stroke="#1C1209" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="23.5" cy="39" r="2.2" fill="#C2410C" opacity=".25" />
        <circle cx="40.5" cy="39" r="2.2" fill="#C2410C" opacity=".25" />
        <path d="M26.5 40.2q5.5 5.2 11 0" stroke="#1C1209" strokeWidth="1.6" fill="#fff" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {online && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 block rounded-full border-2 border-night bg-[var(--ok)]"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </span>
  );
}
