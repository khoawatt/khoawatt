import { ImageResponse } from "next/og";

import { getMessages } from "@/features/i18n/messages";
import { getLocaleFromParams } from "@/features/i18n/server";

export const runtime = "nodejs";
export const alt = "Khoa Watt — portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface OpengraphImageProps {
  params: Promise<{ locale: string }>;
}

export default async function OpengraphImage({ params }: Readonly<OpengraphImageProps>) {
  const locale = await getLocaleFromParams(params);
  const messages = await getMessages(locale);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "56px 64px",
          backgroundColor: "#161513",
          color: "#F5F1EA",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -120,
            top: -120,
            width: 460,
            height: 460,
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <span style={{ color: "#E0B763", fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
            Khoa Watt
          </span>
          <span style={{ color: "#8A867E", fontSize: 20 }}>·</span>
          <span style={{ color: "#C9C4B8", fontSize: 20 }}>{messages.metadata.title}</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 54,
            lineHeight: 1.1,
            fontWeight: 700,
            maxWidth: 920,
          }}
        >
          {messages.metadata.title}
        </div>
        <div style={{ display: "flex", marginTop: 16, maxWidth: 720, fontSize: 22, lineHeight: 1.4, color: "#C9C4B8" }}>
          {messages.metadata.description}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 16, color: "#8A867E" }}>
          khoawatt.com
        </div>
      </div>
    ),
    { ...size },
  );
}
