import { getRssPosts } from "@/features/blog/repository";
import { buildRssFeed } from "@/features/blog/rss";
import { getMessages } from "@/features/i18n/messages";

export const dynamic = "force-dynamic";

export async function GET() {
  const locale = "vi";
  const messages = await getMessages(locale);
  const posts = await getRssPosts(locale);
  const xml = buildRssFeed(
    locale,
    posts,
    messages.metadata.title,
    messages.blog.intro,
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}