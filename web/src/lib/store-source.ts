// Remembers, for this browsing session, how the buyer reached a store:
// from the Ndu market, from errand (chat), or directly from the vendor's own link.
// Runs in the browser only.

export type StoreSource = "market" | "chat" | "direct";

export function rememberSource(slug: string, from: string | null): StoreSource {
  const key = `ndu-from-${slug}`;
  try {
    if (from === "market" || from === "chat") sessionStorage.setItem(key, from);
    const saved = sessionStorage.getItem(key);
    return saved === "market" || saved === "chat" ? saved : "direct";
  } catch {
    return from === "market" || from === "chat" ? from : "direct";
  }
}

// True the first time we see this store in this session (so a visit is counted once).
export function firstVisitThisSession(slug: string): boolean {
  const key = `ndu-visit-${slug}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}
