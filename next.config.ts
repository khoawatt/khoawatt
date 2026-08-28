import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/api/resume-media/[file]": ["./private-assets/resume/**/*"],
  },
  async rewrites() {
    return [
      {
        source: "/blog/:slug.md",
        destination: "/en/blog/:slug/md",
      },
      {
        source: "/:locale/blog/:slug.md",
        destination: "/:locale/blog/:slug/md",
      },
    ];
  },
  images: {
    // Needed for local Supabase where the storage URL resolves to 127.0.0.1.
    // Production Supabase (**.supabase.co) is public and does not require this.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
      // Local Supabase (supabase start) — any port, http and https variants.
      // Next requires explicit `port` when the URL contains a non-default port
      // (54331 for local Supabase), so list both the default and the local port.
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54331",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "127.0.0.1",
        port: "54331",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54331",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        port: "54331",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;