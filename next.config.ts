import type { NextConfig } from "next";

/**
 * Allow-list of remote image hosts the next/image optimizer may fetch from.
 *
 * CMS media (blog covers, project/resume/portfolio buckets) lives in Supabase
 * Storage, so its host is derived from NEXT_PUBLIC_SUPABASE_URL — local and
 * production resolve automatically. To serve images from another service
 * later, append one entry to EXTRA_IMAGE_HOSTS (protocol + hostname, optional
 * port); no other change is needed.
 */
function supabaseStoragePattern(): {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
} | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return {
      protocol: url.protocol === "https:" ? "https" : "http",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
    };
  } catch {
    return null;
  }
}

const EXTRA_IMAGE_HOSTS: {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
}[] = [];

const supabaseHost = supabaseStoragePattern();

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/api/resume-media/[file]": ["./private-assets/resume/**/*"],
  },
  images: {
    remotePatterns: [
      ...(supabaseHost ? [supabaseHost] : []),
      ...EXTRA_IMAGE_HOSTS,
    ],
  },
};

export default nextConfig;
