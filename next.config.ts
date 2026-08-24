import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

function safeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = safeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseRealtimeOrigin = supabaseOrigin?.replace(/^https:/, "wss:") ?? null;
const connectSources = ["'self'", supabaseOrigin, supabaseRealtimeOrigin].filter(Boolean).join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${connectSources}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nonIndexableHeaders = [
  ...securityHeaders,
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      ...["/account/:path*", "/admin/:path*", "/api/:path*", "/auth/:path*", "/clinic/:path*", "/login/:path*", "/operation-error/:path*", "/results/:path*"].map((source) => ({
        source,
        headers: nonIndexableHeaders,
      })),
    ];
  },
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/pwa/icon/192" },
      { source: "/favicon.png", destination: "/pwa/icon/192" },
      { source: "/apple-touch-icon.png", destination: "/apple-icon" },
      { source: "/apple-touch-icon-precomposed.png", destination: "/apple-icon" },
    ];
  },
};

export default nextConfig;
