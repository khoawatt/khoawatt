import { NextResponse } from "next/server";

import { getServiceClient } from "@/features/cms/server";

/**
 * Cron endpoint for retention cleanup and storage retry.
 * Called by Vercel Cron (or manually with CRON_SECRET).
 * - Hard deletes expired trashed rows (30d)
 * - Retries pending storage cleanup queue
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> or Vercel Cron header.
 * In local dev, CRON_SECRET can be unset to allow manual testing.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // allow in dev without secret
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Vercel Cron sends x-vercel-cron: 1
  if (request.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = getServiceClient();
  if (!client) {
    return NextResponse.json({ ok: false, error: "Missing service client config" }, { status: 500 });
  }

  try {
    const { data: hardData, error: hardError } = await client.rpc("cron_hard_delete_expired");
    if (hardError) throw new Error(`hard_delete: ${hardError.message}`);

    const { data: retryData, error: retryError } = await client.rpc("cron_retry_storage_cleanup");
    if (retryError) throw new Error(`retry_storage: ${retryError.message}`);

    // For storage cleanup, the cron function currently just advances backoff;
    // actual storage.objects delete would be attempted via service_role storage client in a real worker.
    // Here we report the counts.

    return NextResponse.json({
      ok: true,
      hardDeleted: (hardData as { hard_deleted?: number })?.hard_deleted ?? 0,
      storageRetried: (retryData as { processed?: number })?.processed ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Cron failed" }, { status: 500 });
  }
}

// Also allow POST for Vercel Cron which sometimes uses POST
export async function POST(request: Request) {
  return GET(request);
}
