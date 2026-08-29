import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { getResumePublicity } from "@/features/cms/resume-publicity";
import { getServiceClient } from "@/features/cms/server";
import { hasCmsConfig } from "@/features/cms/config";

const resumeMediaRoot = join(process.cwd(), "private-assets", "resume");

const approvedMediaFiles = [
  "bachelor-degree.jpg",
  "bachelor-degree-thumb.jpg",
  "toeic.jpg",
  "toeic-thumb.jpg",
  "basic-it-application.jpg",
  "basic-it-application-thumb.jpg",
  "transcript.jpg",
  "transcript-thumb.jpg",
  "englishwing-employment.jpg",
  "englishwing-employment-thumb.jpg",
  "codeforces.jpg",
  "codeforces-thumb.jpg",
] as const;

const DENIED_RESPONSE_HEADERS: Readonly<Record<string, string>> = {
  "Cache-Control": "no-store",
};

interface ResumeMediaRouteContext {
  params: Promise<{ file: string }>;
}

export const dynamic = "force-dynamic";

/** Sanitize the requested filename to a single basename (no path traversal). */
function sanitizeFile(file: string): string {
  return file.replace(/[^a-zA-Z0-9._-]/g, "").replace(/^\.+|\.+$/g, "");
}

async function serveFromStorage(file: string): Promise<NextResponse | null> {
  if (!hasCmsConfig()) return null;

  const client = getServiceClient();
  if (!client) return null;

  try {
    const { data, error } = await client.storage
      .from("resume-media")
      .download(file);
    if (error || !data) return null;

    const bytes = await data.arrayBuffer();
    const contentType =
      data.type || (file.endsWith(".png") ? "image/png" : "image/jpeg");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
      },
    });
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: ResumeMediaRouteContext,
) {
  const publicity = await getResumePublicity();
  if (publicity !== "visible") {
    return new NextResponse("Resume is private", {
      status: 404,
      headers: DENIED_RESPONSE_HEADERS,
    });
  }

  const { file } = await context.params;
  const safeFile = sanitizeFile(file);
  if (!safeFile) {
    return new NextResponse("Not found", {
      status: 404,
      headers: DENIED_RESPONSE_HEADERS,
    });
  }

  // Uploaded resume media lives in the private storage bucket; serve it through
  // this gated route (server-only read of the private bucket).
  const storageResponse = await serveFromStorage(safeFile);
  if (storageResponse) return storageResponse;

  // Fall back to the local approved assets for the pre-existing files.
  if (!(approvedMediaFiles as readonly string[]).includes(safeFile)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: DENIED_RESPONSE_HEADERS,
    });
  }

  try {
    const bytes = await readFile(join(resumeMediaRoot, safeFile));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/jpeg",
      },
    });
  } catch {
    return new NextResponse("Not found", {
      status: 404,
      headers: DENIED_RESPONSE_HEADERS,
    });
  }
}