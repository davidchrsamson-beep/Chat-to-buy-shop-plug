// Opening hours, in Calabar (Lagos) time. (Same file in web/ and chat/.)
// Stores that close after midnight are fine: "6pm – 3am" means open overnight.

export type Hours = {
  open_24h: boolean;
  opens_at: string | null; // "21:00" or "21:00:00"
  closes_at: string | null;
  open_days: number[] | null; // 0 = Sunday … 6 = Saturday
};

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

// 540 -> "9am", 1350 -> "10:30pm", 0 -> "12am"
export function formatMinutes(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h = h24 % 12 || 12;
  return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""}${h24 < 12 ? "am" : "pm"}`;
}

// The current day and minute in Calabar.
export function lagosNow(date = new Date()): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: DAY_NAMES.indexOf(get("weekday")), minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

// true = open, false = closed, null = the store hasn't set its hours.
export function isOpenAt(h: Hours, day: number, minute: number): boolean | null {
  const days = h.open_days?.length ? h.open_days : ALL_DAYS;
  if (h.open_24h) return days.includes(day);
  if (!h.opens_at || !h.closes_at) return null;
  const open = toMinutes(h.opens_at);
  const close = toMinutes(h.closes_at);
  if (open === close) return null;
  if (open < close) return days.includes(day) && minute >= open && minute < close;
  // Overnight (e.g. 6pm – 3am): open late today, or still open from last night.
  if (days.includes(day) && minute >= open) return true;
  return days.includes((day + 6) % 7) && minute < close;
}

function daysLabel(days: number[] | null): string {
  const d = [...(days?.length ? days : ALL_DAYS)].sort();
  if (d.length === 7) return "Every day";
  if (d.join() === "1,2,3,4,5,6") return "Mon – Sat";
  if (d.join() === "1,2,3,4,5") return "Mon – Fri";
  return d.map((n) => DAY_NAMES[n]).join(", ");
}

// "Open 24 hours · Every day" / "9am – 10pm · Mon – Sat" / null if not set
export function hoursLabel(h: Hours): string | null {
  if (h.open_24h) return `Open 24 hours · ${daysLabel(h.open_days)}`;
  if (!h.opens_at || !h.closes_at) return null;
  return `${formatMinutes(toMinutes(h.opens_at))} – ${formatMinutes(toMinutes(h.closes_at))} · ${daysLabel(h.open_days)}`;
}

// "Open now · till 3am" / "Closed now · opens 9am" / "Open 24 hours" / null
export function statusLabel(h: Hours, now = lagosNow()): { open: boolean | null; text: string | null } {
  const open = isOpenAt(h, now.day, now.minute);
  if (open === null) return { open: null, text: null };
  if (h.open_24h) return { open, text: open ? "Open 24 hours" : "Closed today" };
  const close = formatMinutes(toMinutes(h.closes_at as string));
  const opens = formatMinutes(toMinutes(h.opens_at as string));
  return { open, text: open ? `Open now · till ${close}` : `Closed now · opens ${opens}` };
}
