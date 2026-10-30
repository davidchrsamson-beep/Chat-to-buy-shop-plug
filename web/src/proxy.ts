import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 runs this before matching pages ("proxy", formerly "middleware").
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only vendor and login-link pages need it; the market and storefronts stay fast.
export const config = {
  matcher: ["/vendor/:path*", "/auth/:path*"],
};
