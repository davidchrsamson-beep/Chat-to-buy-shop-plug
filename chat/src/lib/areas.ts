// Calabar neighbourhoods vendors can deliver to, and buyers can ask for.
// (Same file in web/ and chat/. Add more names any time.)
export const CALABAR_WIDE = "All of Calabar";

export const CALABAR_AREAS = [
  "8 Miles",
  "Akim",
  "Akpabuyo",
  "Anantigha",
  "Atekong",
  "Atimbo",
  "Big Qua",
  "Bogobiri",
  "Calabar South",
  "Diamond Hill",
  "Duke Town",
  "Edim Otop",
  "Efut",
  "Ekorinim",
  "Ekpo Abasi",
  "Esuk Utan",
  "Etta Agbor",
  "Federal Housing",
  "Goldie",
  "Henshaw Town",
  "Ikot Ansa",
  "Ikot Effanga",
  "Ikot Ishie",
  "Ikot Omin",
  "Kasuk",
  "Lemna",
  "Marian",
  "Mayne Avenue",
  "MCC Road",
  "Ndidem Usang Iso",
  "Odukpani",
  "Parliamentary",
  "Satellite Town",
  "State Housing",
  "Unical",
  "Watt Market",
] as const;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// "marian road", "MARIAN" -> "Marian"; unknown -> ""
export function normaliseArea(input: string): string {
  const s = squash(input ?? "");
  if (!s) return "";
  if (s === squash(CALABAR_WIDE) || s === "calabar") return CALABAR_WIDE;
  return (
    CALABAR_AREAS.find((a) => s === squash(a)) ??
    (s.length >= 4 ? CALABAR_AREAS.find((a) => s.startsWith(squash(a)) || squash(a).startsWith(s)) : undefined) ??
    ""
  );
}

// How a store relates to the buyer's area: based there, delivers there, or neither.
export function servesArea(
  v: { neighbourhood: string | null; delivers: boolean; delivery_areas: string[] | null },
  area: string,
): "in" | "delivers" | null {
  if (!area || area === CALABAR_WIDE) return null;
  if (v.neighbourhood && normaliseArea(v.neighbourhood) === area) return "in";
  if (v.delivers && (v.delivery_areas ?? []).some((a) => a === area || a === CALABAR_WIDE)) return "delivers";
  return null;
}

// "Delivers to Marian, Atekong +3" / "Delivers across Calabar"
export function deliveryLabel(v: { delivers: boolean; delivery_areas: string[] | null }): string | null {
  if (!v.delivers) return null;
  const areas = v.delivery_areas ?? [];
  if (areas.includes(CALABAR_WIDE)) return "Delivers across Calabar";
  if (areas.length === 0) return "Delivers";
  return `Delivers to ${areas.slice(0, 2).join(", ")}${areas.length > 2 ? ` +${areas.length - 2}` : ""}`;
}
