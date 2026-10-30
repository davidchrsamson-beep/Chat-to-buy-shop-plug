import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages only a logged-in vendor may open.
const PROTECTED = ["/vendor/dashboard", "/vendor/products", "/vendor/settings", "/vendor/listing"];
// Pages a logged-in vendor doesn't need (send them to their dashboard instead).
// Sign-up is NOT here: "Sell on Ndu" must always show the sign-up page (it explains if you're already logged in).
const GUEST_ONLY = ["/vendor/login"];

// Runs before every vendor page: refreshes the login if it's about to expire,
// and keeps logged-out visitors away from the dashboard.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims checks the login is genuine (signed by Supabase), not just present.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;

  const goTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) return goTo("/vendor/login");
  if (signedIn && GUEST_ONLY.includes(path)) return goTo("/vendor/dashboard");

  return response;
}
