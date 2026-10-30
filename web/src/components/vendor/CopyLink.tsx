"use client";

import { useState } from "react";

// Shows the storefront link with a Copy button, ready to paste into a bio.
export default function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link is still visible to copy by hand.
    }
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <a href={path} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-brand">
        {path}
      </a>
      <button
        type="button"
        onClick={copy}
        className="min-h-11 shrink-0 rounded-xl border border-gray-200 px-4 text-sm font-medium hover:border-brand"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}
