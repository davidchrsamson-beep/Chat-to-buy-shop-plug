import type { Metadata } from "next";
import AdminApp from "@chat/components/admin/AdminApp";
import { BRAND } from "@chat/lib/brand";

export const metadata: Metadata = { title: `${BRAND} admin`, robots: { index: false, follow: false } };

// The Shop Plug admin: log in, receive requests, reply, send bills, confirm payments.
export default function AdminPage() {
  return <AdminApp />;
}
