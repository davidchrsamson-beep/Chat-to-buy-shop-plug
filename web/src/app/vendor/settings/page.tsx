import DashboardShell from "@/components/vendor/DashboardShell";
import StoreSettingsForm from "@/components/vendor/StoreSettingsForm";
import { requireVendor } from "@/lib/vendor";

export default async function SettingsPage() {
  const { vendor } = await requireVendor();
  if (!vendor) return null;

  return (
    <DashboardShell active="settings" storeName={vendor.business_name}>
      <h1 className="mb-1 text-2xl font-bold">Store settings</h1>
      <p className="mb-4 text-sm text-gray-500">This is what buyers see on your storefront.</p>
      <StoreSettingsForm vendor={vendor} />
    </DashboardShell>
  );
}
