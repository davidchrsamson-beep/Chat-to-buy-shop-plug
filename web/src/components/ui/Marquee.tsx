import type { CSSProperties } from "react";

type Tone = "led" | "plain" | "ink";

const TONES: Record<Tone, string> = {
  // Glowing amber letters on black, like a filling-station or bar sign.
  led: "bg-[#0b0b0d] text-led font-mono font-semibold uppercase tracking-[0.2em] [text-shadow:0_0_6px_rgba(255,176,32,0.8)]",
  // Just moving text, no background (takes the colour around it).
  plain: "",
  // Just moving text, no background, bold black.
  ink: "text-ink font-semibold uppercase tracking-[0.2em]",
};

// One line of text that enters from the right edge, travels across, disappears at the left edge,
// then comes back in from the right. Shown once at a time, never doubled up.
export default function Marquee({
  text,
  tone = "led",
  speed = 18,
  className = "",
}: {
  text: string;
  tone?: Tone;
  speed?: number; // seconds to cross once
  className?: string;
}) {
  const style = { "--marquee-speed": `${speed}s` } as CSSProperties;
  return (
    <div className={`overflow-hidden whitespace-nowrap ${TONES[tone]} ${className}`} style={style}>
      <span className="sr-only">{text}</span>
      <span className="ndu-marquee" aria-hidden="true">{text}</span>
    </div>
  );
}
