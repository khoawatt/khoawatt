import { getMessages } from "@/features/i18n/messages";
import { getRssPostCount, getRssPostsPaginated } from "@/features/blog/repository";
import { buildJsonFeed } from "@/features/blog/rss";

export const dynamic = "force-dynamic";

const FEED_PAGE_SIZE = 10;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const page = pageParam ? Number(pageParam) : 1;

  if (!Number.isInteger(page) || page < 1) {
    return new Response(JSON.stringify({ error: "Invalid page" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = await getMessages("en");
  const [total, posts] = await Promise.all([
    getRssPostCount(),
    getRssPostsPaginated("en", FEED_PAGE_SIZE, (page - 1) * FEED_PAGE_SIZE),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / FEED_PAGE_SIZE));

  if (page > totalPages && total > 0) {
    return new Response(JSON.stringify({ error: "Page not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const json = buildJsonFeed(posts, messages.metadata.title, messages.blog.intro, {
    page,
    totalPages,
    totalItems: total,
  });

  return new Response(json, {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
