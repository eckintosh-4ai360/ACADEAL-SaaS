import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import type { Configuration } from "webpack";

const isDevelopment = process.env.NODE_ENV === "development";
const isPWADevEnabled = process.env.ENABLE_PWA_DEV === "true";
const shouldEnablePWA = !isDevelopment || isPWADevEnabled;

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      // Cache-first for static Next.js assets
      urlPattern: /^https?:\/\/.*\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static-assets",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      // Network-first for pages with offline fallback
      urlPattern: /^https?:\/\/.*\/dashboard.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "dashboard-pages",
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      // Network-only for API routes — never serve stale API data
      urlPattern: /^https?:\/\/.*\/api\/.*/i,
      handler: "NetworkOnly",
    },
    {
      // Cache-first for images
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    {
      // Cache-first for fonts
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
});

/**
 * Content-Security-Policy.
 *
 * `script-src` still carries 'unsafe-inline' because the pop-out bootstrap in
 * app/layout.tsx, the theme <style> block, and Next's own hydration scripts are
 * all inline. Tightening that to a nonce means generating one in src/proxy.ts,
 * forwarding it as x-nonce, and stamping it on those tags — worth doing, but it
 * has to be verified against a running app rather than shipped blind.
 *
 * The directives that do not depend on inline handling are enforced strictly,
 * and they are the ones that matter most here: an injected <script src> from
 * another origin is blocked, the page cannot be framed, and form posts cannot
 * be redirected off-site.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  //* 'unsafe-eval' is required by the webpack dev runtime only.
  isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  //* blob:/data: cover the jsPDF and html2canvas export paths.
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' data: blob:",
  "connect-src 'self' https://res.cloudinary.com",
  //* YouTube lessons render in an embed.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  //* Legacy companion to frame-ancestors, for browsers that predate CSP 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        //* Nothing under the API should ever be cached by a shared proxy —
        //* these responses are tenant- and user-specific.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },

  //* Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  //* Modularize imports for better tree-shaking
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },

  //* Image optimization
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "localhost" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    //* Was 50mb. Report archives post base64 PDFs, which is the largest
    //* legitimate payload; 15mb covers those with room to spare while cutting
    //* how much memory a single request can claim.
    serverActions: { bodySizeLimit: "15mb" },
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },

  //* Webpack configuration for Prisma
  webpack: (config: Configuration, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      const existingExternals = config.externals;

      // pdf-parse reads a local test PDF at require()-time, which fails when
      // Next.js tries to bundle it. mammoth relies on Node.js streams/buffers.
      // Externalising both ensures they are loaded from node_modules at runtime.
      const serverOnlyModules = ["@prisma/client", "pdf-parse", "mammoth"];

      if (Array.isArray(existingExternals)) {
        config.externals = [...existingExternals, ...serverOnlyModules];
      } else if (existingExternals) {
        config.externals = [existingExternals, ...serverOnlyModules];
      } else {
        config.externals = serverOnlyModules;
      }
    }
    return config;
  },
};

// Skip next-pwa entirely during `next dev` to avoid duplicate "PWA support is disabled"
// logs and service worker interference with HMR. Set ENABLE_PWA_DEV=true to opt in.
export default shouldEnablePWA ? withPWA(nextConfig) : nextConfig;
