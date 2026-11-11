"use client";

import { useEffect, useState } from "react";

// A ChatGPT-style message box where someone seems to be typing what they want.
// Each example types out, pauses, is erased, and the next one types out. Nothing is ever sent.
// Tapping the box opens the real chat. To change the examples, edit MESSAGES below.
const MESSAGES = [
  "Wussup, help me get 4 black bullets and 2 can malts. Please add 3 condoms too as you're coming.",
  "Hello.. please help me get 7 yoghurt culture at Marian market.",
  "Hello.. can you help me buy 3 High Quality sliced bread, 3 tins of peak milk, and 1 satchet milo, the big size.",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function TypingDemo({ onOpen }: { onOpen: () => void }) {
  const [text, setText] = useState("");

  useEffect(() => {
    // People who turn animations off see the first example, still.
    let still = false;
    try {
      still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {}
    if (still) {
      setText(MESSAGES[0]);
      return;
    }

    let alive = true;
    (async () => {
      await sleep(600);
      for (let m = 0; alive; m++) {
        const msg = MESSAGES[m % MESSAGES.length];
        // Type it, letter by letter, at a slightly uneven human speed.
        for (let i = 1; i <= msg.length && alive; i++) {
          setText(msg.slice(0, i));
          await sleep(30 + Math.random() * 45);
        }
        await sleep(2600); // let it be read
        // Erase it quickly, like holding backspace.
        for (let i = msg.length - 1; i >= 0 && alive; i -= 2) {
          setText(msg.slice(0, i));
          await sleep(12);
        }
        setText("");
        await sleep(700);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <button type="button" onClick={onOpen} aria-label="Make a request" className="block w-full min-w-0 text-left">
      <span aria-hidden="true" className="flex items-end gap-2 rounded-[28px] border border-line bg-night px-3 py-2.5 shadow-[0_2px_14px_rgba(0,0,0,0.07)]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center text-snow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>

        {/* All examples sit invisibly in the same spot, so the box is always tall enough for the
            longest one and nothing below it jumps while the text types. */}
        <span className="grid min-w-0 flex-1 py-1.5 text-[15px] leading-[1.4]">
          {MESSAGES.map((m) => (
            <span key={m} className="invisible col-start-1 row-start-1 break-words">
              {m}
            </span>
          ))}
          <span className="col-start-1 row-start-1 self-start break-words">
            {text ? (
              <>
                {text}
                <span className="errand-caret ml-px inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-accent" />
              </>
            ) : (
              <span className="text-mute">
                <span className="errand-caret mr-px inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-accent" />
                Message Shop Plug…
              </span>
            )}
          </span>
        </span>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center text-mute">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-night transition ${text ? "bg-accent" : "bg-accent/40"}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </span>
      </span>

      <style>{`
        @keyframes errand-blink { 50% { opacity: 0; } }
        .errand-caret { animation: errand-blink 1s step-end infinite; }
        @media (prefers-reduced-motion: reduce) { .errand-caret { animation: none; } }
      `}</style>
    </button>
  );
}
