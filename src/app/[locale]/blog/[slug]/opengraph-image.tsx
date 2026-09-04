import { ImageResponse } from "next/og";

import { getPostBySlug } from "@/features/blog/repository";
import { getMessages } from "@/features/i18n/messages";
import { getLocaleFromParams } from "@/features/i18n/server";

// Isolated route: an OG-generation failure never breaks the article page.
export const runtime = "nodejs";
export const alt = "Khoa Watt — blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OpengraphImageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function OpengraphImage({
  params,
}: Readonly<OpengraphImageProps>) {
  const locale = await getLocaleFromParams(params);
  const { slug } = await params;
  const [post, messages] = await Promise.all([
    getPostBySlug(locale, slug),
    getMessages(locale),
  ]);

  const title = post ? post.title : messages.metadata.title;
  const category = post ? post.category.name : messages.blog.eyebrow;
  const date = post
    ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(post.publishedAt))
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "72px 80px",
          backgroundColor: "#161513",
          color: "#F5F1EA",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -180,
            top: -180,
            width: 520,
            height: 520,
            borderRadius: "50%",
            backgroundColor: "rgba(224, 183, 99, 0.14)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 10,
            backgroundColor: "#C8963E",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 52,
          }}
        >
          <span style={{ color: "#E0B763", fontSize: 34, fontWeight: 700, letterSpacing: 2 }}>
            Khoa Watt
          </span>
          <span style={{ color: "#8A867E", fontSize: 24 }}>·</span>
          <span style={{ color: "#C9C4B8", fontSize: 24 }}>{messages.metadata.title}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "8px 18px",
            borderRadius: 999,
            backgroundColor: "rgba(224, 183, 99, 0.16)",
            color: "#E0B763",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          {category}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            maxWidth: 920,
            fontSize: 56,
            lineHeight: 1.16,
            fontWeight: 700,
          }}
        >
          {title.length > 120 ? `${title.slice(0, 120).trimEnd()}…` : title}
        </div>
        {date ? (
          <div style={{ display: "flex", marginTop: "auto", fontSize: 24, color: "#8A867E" }}>
            {date}
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}