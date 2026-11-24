import type { Metadata } from "next";
import AdminApp from "@chat/components/admin/AdminApp";
import { BRAND } from "@chat/lib/brand";

export const metadata: Metadata = { title: `${BRAND} admin`, robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminApp />;
}
