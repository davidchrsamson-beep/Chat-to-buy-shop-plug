import Link from "next/link";
import { formatPrice } from "@/lib/price";

export type TileProduct = {
  id: string;
  name: string;
  price_type: string;
  price_kobo: number | null;
  price_max_kobo: number | null;
  negotiable: boolean;
  in_stock: boolean;
  cover: string | null;
};

// One product on a storefront grid (and the small boxes in "More from this store").
// `aspect` lets the grid give pictures different heights.
export default function ProductTile({
  slug,
  product,
  small,
  aspect = "aspect-[4/5]",
}: {
  slug: string;
  product: TileProduct;
  small?: boolean;
  aspect?: string;
}) {
  return (
    <Link href={`/s/${slug}/p/${product.id}`} className="group block">
      <div className={`relative overflow-hidden rounded-2xl bg-gray-100 ${small ? "aspect-square" : aspect}`}>
        {product.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.cover}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        )}
        {!product.in_stock && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
            Out of stock
          </span>
        )}
        {product.negotiable && !small && (
          <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
            Negotiable
          </span>
        )}
      </div>
      <p className={`mt-2 font-bold ${small ? "text-sm" : "text-base"}`}>{formatPrice(product)}</p>
      <p className="truncate text-xs text-gray-600">{product.name}</p>
    </Link>
  );
}
