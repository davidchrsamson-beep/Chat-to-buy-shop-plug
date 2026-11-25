import ErrandApp from "@chat/components/ErrandApp";
import { loadHomepageData } from "@/lib/homepage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await loadHomepageData();
  return <ErrandApp homepage={data} />;
}
