import type { Locale } from "@/features/i18n/config";
import { getAbsoluteUrl } from "@/features/seo/config";

export interface NewsletterEmail {
  subject: string;
  text: string;
  html: string;
  from: string;
  to: string;
}

const fromFallback = "QVAK Portfolio <portfolio@feaon.com>";

export function getNewsletterFromAddress(): string {
  return process.env.NEWSLETTER_FROM_EMAIL ?? process.env.CONTACT_FROM_EMAIL ?? fromFallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildNewsletterConfirmationEmail(
  email: string,
  locale: Locale,
  siteUrl?: string,
): Pick<NewsletterEmail, "subject" | "text" | "html"> {
  const site = siteUrl ?? getAbsoluteUrl("/");
  const blogUrl = getAbsoluteUrl(locale === "vi" ? "/vi/blog" : "/blog");
  const homeUrl = getAbsoluteUrl(locale === "vi" ? "/vi" : "/");

  const isVi = locale === "vi";

  const subject = isVi
    ? "Bạn đã đăng ký — QVAK Portfolio"
    : "You’re subscribed — QVAK Portfolio";

  const title = isVi ? "Cảm ơn bạn đã đăng ký!" : "Thanks for subscribing!";
  const intro = isVi
    ? `Bạn đã đăng ký bản tin với địa chỉ ${email}. Mình sẽ gửi cập nhật thỉnh thoảng về dự án và thử nghiệm mới — không spam, hủy bất cứ lúc nào.`
    : `You’ve subscribed with ${email}. I’ll send occasional updates on projects and experiments — no spam, unsubscribe anytime.`;

  const ctaLabel = isVi ? "Xem blog" : "Visit blog";
  const unsubscribeLabel = isVi ? "Hủy đăng ký" : "Unsubscribe";
  const unsubscribeUrl = `${getAbsoluteUrl("/api/newsletter/unsubscribe")}?email=${encodeURIComponent(email)}&locale=${locale}`;
  const footerNote = isVi
    ? "Bạn nhận được email này vì đã đăng ký tại khoawatt.com. Nếu không phải bạn, hãy bỏ qua email này."
    : "You’re receiving this because you subscribed at khoawatt.com. If this wasn’t you, just ignore this email.";

  const text = [
    title,
    "",
    intro,
    "",
    `${ctaLabel}: ${blogUrl}`,
    `Home: ${homeUrl}`,
    "",
    footerNote,
    `${unsubscribeLabel}: ${unsubscribeUrl}`,
    "— Khoa Watt",
  ].join("\n");

  const html = `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#161513;font-family:Arial,Helvetica,sans-serif;color:#F5F1EA;">
  <div style="max-width:640px;margin:0 auto;padding:32px 24px;">
    <div style="border-left:4px solid #C8963E;padding-left:16px;margin-bottom:24px;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E0B763;font-weight:700;">QVAK · QVAK Portfolio</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px;line-height:1.2;">${escapeHtml(title)}</div>
    </div>
    <div style="background:#1E1C1A;border:1px solid #2A2826;border-radius:16px;padding:24px;line-height:1.65;color:#C9C4B8;">
      <p style="margin:0 0 16px;color:#F5F1EA;font-size:16px;">${escapeHtml(intro)}</p>
      <p style="margin:0;">
        <a href="${blogUrl}" style="display:inline-block;background:#C8963E;color:#161513;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px;">${escapeHtml(ctaLabel)}</a>
        <span style="display:inline-block;width:12px;"></span>
        <a href="${homeUrl}" style="color:#E0B763;text-decoration:underline;">${isVi ? "Trang chủ" : "Home"}</a>
      </p>
    </div>
    <div style="margin-top:20px;padding:16px;background:rgba(224,183,99,0.08);border:1px solid rgba(224,183,99,0.18);border-radius:12px;color:#8A867E;font-size:13px;line-height:1.6;">
      ${escapeHtml(footerNote)}<br>
      <span style="color:#C9C4B8;">${escapeHtml(email)}</span> · <a href="${site}" style="color:#E0B763;text-decoration:none;">khoawatt.com</a>
      <div style="margin-top:10px;">
        <a href="${unsubscribeUrl}" style="display:inline-block;color:#8A867E;text-decoration:underline;font-size:12px;">${escapeHtml(unsubscribeLabel)}</a>
        <span style="color:#5A5752;font-size:12px;"> · ${escapeHtml(email)}</span>
      </div>
    </div>
    <div style="margin-top:10px;text-align:center;">
      <a href="${unsubscribeUrl}" style="display:inline-block;background:transparent;color:#8A867E;border:1px solid #2A2826;text-decoration:none;font-size:13px;padding:8px 16px;border-radius:999px;">${escapeHtml(unsubscribeLabel)}</a>
    </div>
    <div style="margin-top:16px;color:#8A867E;font-size:12px;">— Khoa Watt · <a href="${site}" style="color:#8A867E;">khoawatt.com</a></div>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
