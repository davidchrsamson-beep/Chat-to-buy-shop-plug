// A string of twinkling Christmas lights across the top of a section.
const COLOURS = ["#ff5a5f", "#ffd166", "#06d6a0", "#4cc9f0", "#ff8fab"];

export default function LightString({ count = 28, className = "" }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none flex justify-between px-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const colour = COLOURS[i % COLOURS.length];
        return (
          <span
            key={i}
            className="ndu-twinkle block h-2.5 w-2.5 rounded-full"
            style={{
              background: colour,
              boxShadow: `0 0 8px 2px ${colour}`,
              animationDelay: `${(i % 7) * 0.22}s`,
              marginTop: i % 2 === 0 ? 0 : 6, // a gentle sag, like a real string of lights
            }}
          />
        );
      })}
    </div>
  );
}
