// Type declaration for next-pwa (no official @types package)
declare module "next-pwa" {
  import type { NextConfig } from "next";

  interface RuntimeCachingOptions {
    cacheName?: string;
    expiration?: {
      maxEntries?: number;
      maxAgeSeconds?: number;
    };
    networkTimeoutSeconds?: number;
    backgroundSync?: {
      name: string;
      options?: {
        maxRetentionTime?: number;
      };
    };
  }

  interface RuntimeCachingEntry {
    urlPattern: string | RegExp;
    handler: "CacheFirst" | "CacheOnly" | "NetworkFirst" | "NetworkOnly" | "StaleWhileRevalidate";
    options?: RuntimeCachingOptions;
  }

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    sw?: string;
    scope?: string;
    reloadOnOnline?: boolean;
    buildExcludes?: Array<string | RegExp>;
    runtimeCaching?: RuntimeCachingEntry[];
    fallbacks?: {
      document?: string;
      image?: string;
      audio?: string;
      video?: string;
      font?: string;
    };
    cacheOnFrontEndNav?: boolean;
    aggressiveFrontEndNavCaching?: boolean;
    dynamicStartUrl?: boolean;
    dynamicStartUrlRedirect?: string;
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}
