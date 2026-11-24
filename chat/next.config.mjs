// Shop Plug security settings (the same checklist as the Ndu site).
const isDev = process.env.NODE_ENV === "development";

// The database (for the admin login) is the only outside address the page may talk to.
let supabase = "https://*.supabase.co";
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
} catch {}

const csp = [
  "default-src 'self'",
  // Next.js needs inline scripts; the dev server also needs eval (only on your laptop).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Photos: our own, uploaded ones (https), and receipt previews made on the phone (data:, blob:).
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabase.replace("https://", "wss://")}${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'", // nobody can put Shop Plug inside their own site to trick people
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig = {
  poweredByHeader: false, // don't advertise what the site is built with
  logging: { serverFunctions: false }, // never print what people type (passwords, addresses) in server logs
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        // The admin pages are never stored by browsers or shared caches.
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
