import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Don't print server action inputs (they include passwords) in the terminal.
  logging: {
    serverFunctions: false,
  },
  async rewrites() {
    return [
      {
        source: "/find-a-plug",
        destination: "https://shopplug.netlify.app/find-a-plug",
      },
      {
        source: "/find-a-plug/:path*",
        destination: "https://shopplug.netlify.app/find-a-plug/:path*",
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;