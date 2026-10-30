import type { ReactNode } from "react";
import Marquee from "./Marquee";

function chunk<T>(list: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size));
  return rows;
}

// How far down (in px) each column starts.
// The proposed uneven row: left at the top, middle dips deepest, right dips a little.
const UNEVEN_3 = [0, 112, 40];
const UNEVEN_2 = [0, 72]; // phones: the right column dips
const EVEN_3 = [0, 0, 0];
const EVEN_2 = [0, 0];

// Product grid where rows alternate: uneven, even, uneven, even…
// `startUneven` decides whether the FIRST row is uneven, so neighbouring sections
// can start on opposite rows (uneven/even, then even/uneven), giving a steady rhythm.
// `line` (optional) is a moving line of text shown ONCE, above the deepest product
// of the first uneven row.
export default function StaggeredGrid({
  items,
  startUneven = true,
  line,
}: {
  items: ReactNode[];
  startUneven?: boolean;
  line?: string | null;
}) {
  const isUneven = (row: number) => (row % 2 === 0) === startUneven;
  const firstUnevenRow = startUneven ? 0 : 1;

  const column = (item: ReactNode, offset: number, withLine: boolean) => (
    <div>
      {withLine && line ? (
        <div className="flex items-center" style={{ height: offset }}>
          <Marquee text={line} tone="ink" speed={14} className="w-full text-[11px]" />
        </div>
      ) : (
        offset > 0 && <div style={{ height: offset }} aria-hidden="true" />
      )}
      {item}
    </div>
  );

  return (
    <>
      {/* Phones: 2 across */}
      <div className="space-y-5 sm:hidden">
        {chunk(items, 2).map((row, r) => {
          const shape = isUneven(r) ? UNEVEN_2 : EVEN_2;
          return (
            <div key={r} className="grid grid-cols-2 items-start gap-3">
              {row.map((item, c) => (
                <div key={c}>{column(item, shape[c], r === firstUnevenRow && c === 1)}</div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Wider screens: 3 across */}
      <div className="hidden space-y-8 sm:block">
        {chunk(items, 3).map((row, r) => {
          const shape = isUneven(r) ? UNEVEN_3 : EVEN_3;
          return (
            <div key={r} className="grid grid-cols-3 items-start gap-5">
              {row.map((item, c) => (
                <div key={c}>{column(item, shape[c], r === firstUnevenRow && c === 1)}</div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
