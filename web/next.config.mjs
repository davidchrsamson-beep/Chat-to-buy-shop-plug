import path from "node:path";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  env: {
    NEXT_PUBLIC_BASE_PATH: "/find-a-plug",
  },
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  poweredByHeader: false,
  // Don't print server action inputs (they include passwords) in the terminal.
  logging: {
    serverFunctions: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  webpack(config) {
    config.resolve.modules = [
      path.resolve(process.cwd(), "node_modules"),
      ...(config.resolve.modules ?? ["node_modules"]),
    ];
    return config;
  },
};

export default nextConfig;