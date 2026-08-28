import { NextResponse } from "next/server";

import { getServiceClient } from "@/features/cms/server";
import { getLocaleFromParams } from "@/features/i18n/server";
import type { Locale } from "@/features/i18n/config";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ locale: string; slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const locale = (await getLocaleFromParams(params)) as Locale;

  const client = getServiceClient();
  if (!client) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  try {
    const { data, error } = await client
      .from("blog_posts")
      .select(
        "id, slug, blog_post_translations!inner(locale, title, content_md)",
      )
      .eq("slug", slug)
      .eq("status", "published")
      .eq("blog_post_translations.locale", locale)
      .maybeSingle();

    if (error || !data) {
      return new NextResponse("Not found", { status: 404 });
    }

    const row = data as unknown as {
      slug: string;
      blog_post_translations: Array<{
        locale: string;
        title: string;
        content_md: string;
      }>;
    };

    const translation = row.blog_post_translations[0];
    if (!translation) {
      return new NextResponse("Not found", { status: 404 });
    }

    const body = translation.content_md;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Content-Disposition": `inline; filename="${slug}.md"`,
      },
    });
  } catch {
    return new NextResponse("Internal error", { status: 500 });
  }
}
