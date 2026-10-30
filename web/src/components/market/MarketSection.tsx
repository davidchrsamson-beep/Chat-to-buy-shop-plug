import type { ReactNode } from "react";
import StaggeredGrid from "@/components/ui/StaggeredGrid";

// A green band with a white heading over a white panel framed in green (as on the current site).
// Rows alternate uneven/even; `startUneven` lets neighbouring sections start on opposite rows.
export default function MarketSection({
  title,
  icon,
  items,
  startUneven,
  line,
}: {
  title: string;
  icon?: string;
  items: ReactNode[];
  startUneven: boolean;
  line?: string;
}) {
  return (
    <section aria-label={title} className="relative z-10 mx-auto mb-6 max-w-5xl">
      <h2 className="bg-brand px-5 py-3 text-lg font-bold text-white">
        {icon && <span aria-hidden="true">{icon} </span>}
        {title}
      </h2>
      <div className="border-x-[6px] border-b-[6px] border-brand bg-white p-4">
        <StaggeredGrid items={items} startUneven={startUneven} line={line} />
      </div>
    </section>
  );
}
