// The details a buyer needs for each kind of product.
// Fashion needs size and colour; phone accessories need the phone model; and so on.
// These become filters for errand's matching later, so keep the keys stable.

export type AttributeField = { key: string; label: string; placeholder: string };

const F = {
  size: { key: "size", label: "Size", placeholder: "e.g. 12, M, 42" },
  colour: { key: "colour", label: "Colour", placeholder: "e.g. Red, wine, gold" },
  material: { key: "material", label: "Material / fabric", placeholder: "e.g. Lace, cotton, leather" },
  brand: { key: "brand", label: "Brand", placeholder: "e.g. Nivea, Dior, Oraimo" },
  volume: { key: "volume", label: "Size / volume", placeholder: "e.g. 100ml, 250g" },
  scent: { key: "scent", label: "Scent", placeholder: "e.g. Vanilla, woody, fresh" },
  length: { key: "length", label: "Length", placeholder: "e.g. 18 inches" },
  hair_type: { key: "hair_type", label: "Hair type", placeholder: "e.g. Bone straight, curly" },
  model: { key: "model", label: "Phone model", placeholder: "e.g. iPhone 13, Tecno Camon 20" },
  age_range: { key: "age_range", label: "Age range", placeholder: "e.g. 2–4 years" },
  dimensions: { key: "dimensions", label: "Size / dimensions", placeholder: "e.g. 6 seater, 50 x 50 cm" },
} satisfies Record<string, AttributeField>;

const BY_CATEGORY: Record<string, AttributeField[]> = {
  fashion: [F.size, F.colour, F.material],
  accessories: [F.colour, F.material, F.brand],
  beauty: [F.volume, F.brand],
  perfumes: [F.volume, F.brand, F.scent],
  wigs: [F.length, F.hair_type, F.colour],
  bags: [F.colour, F.material, F.size],
  "phone-accessories": [F.model, F.brand, F.colour],
  "kids-baby": [F.age_range, F.size, F.colour],
  "home-living": [F.dimensions, F.material, F.colour],
};

export function fieldsFor(categorySlug: string | null | undefined): AttributeField[] {
  return BY_CATEGORY[categorySlug ?? ""] ?? [F.colour, F.size];
}

// Friendly label for any stored detail key, e.g. "hair_type" -> "Hair type".
export function attributeLabel(key: string): string {
  const known = Object.values(F).find((f) => f.key === key);
  return known ? known.label : key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
