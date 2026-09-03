import { getServiceClient } from "@/features/cms/server";
import { hasCmsConfig } from "@/features/cms/config";

export const dynamic = "force-dynamic";

function htmlPage(title: string, message: string, lang: string): string {
  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#161513;font-family:Arial,Helvetica,sans-serif;color:#F5F1EA;">
  <div style="max-width:640px;margin:0 auto;padding:48px 24px;text-align:center;">
    <div style="border-left:4px solid #C8963E;padding-left:16px;margin-bottom:24px;text-align:left;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E0B763;font-weight:700;">QVAK · QVAK Portfolio</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px;">${title}</div>
    </div>
    <div style="background:#1E1C1A;border:1px solid #2A2826;border-radius:16px;padding:32px;line-height:1.65;color:#C9C4B8;font-size:16px;">
      ${message}
    </div>
    <div style="margin-top:20px;"><a href="/" style="color:#E0B763;text-decoration:underline;">← ${lang === "vi" ? "Về trang chủ" : "Back to home"}</a></div>
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email") ?? "";
  const rawLocale = url.searchParams.get("locale") ?? "en";
  const locale: "en" | "vi" = rawLocale === "vi" ? "vi" : "en";
  const email = rawEmail.trim().toLowerCase();
  const lang = locale;

  if (!email || !email.includes("@") || email.length > 254) {
    return new Response(
      htmlPage(
        lang === "vi" ? "Liên kết không hợp lệ" : "Invalid link",
        lang === "vi"
          ? "<p>Email không hợp lệ. Vui lòng thử lại từ form bản tin.</p>"
          : "<p>Invalid email. Please try again from the newsletter form.</p>",
        lang,
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  if (!hasCmsConfig()) {
    return new Response(
      htmlPage(
        lang === "vi" ? "Lỗi hệ thống" : "Server error",
        lang === "vi" ? "<p>Không thể kết nối hệ thống lúc này.</p>" : "<p>Cannot connect at the moment.</p>",
        lang,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const client = getServiceClient();
  if (!client) {
    return new Response(
      htmlPage("Server error", "<p>Cannot connect.</p>", lang),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const { data, error } = await client
    .from("newsletter_subscribers")
    .delete()
    .eq("email", email)
    .select("email")
    .maybeSingle();

  // Supabase delete with no match returns data null without error - treat as already unsubscribed
  if (error) {
    return new Response(
      htmlPage(
        lang === "vi" ? "Đã có lỗi" : "Something went wrong",
        lang === "vi"
          ? "<p>Đã có lỗi khi hủy đăng ký — vui lòng thử lại sau.</p>"
          : "<p>Something went wrong — please try again shortly.</p>",
        lang,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const wasSubscribed = !!data;

  return new Response(
    htmlPage(
      lang === "vi" ? "Đã hủy đăng ký" : "Unsubscribed",
      wasSubscribed
        ? lang === "vi"
          ? `<p>Bạn đã hủy đăng ký <strong>${email}</strong> thành công. Bạn sẽ không nhận bản tin nữa.</p><p>Nếu đổi ý, bạn có thể đăng ký lại bất cứ lúc nào ở chân trang.</p>`
          : `<p>You’ve been unsubscribed <strong>${email}</strong> successfully. You won’t receive further newsletters.</p><p>If you change your mind, you can resubscribe anytime from the footer.</p>`
        : lang === "vi"
          ? `<p>Email <strong>${email}</strong> không có trong danh sách hoặc đã hủy trước đó.</p>`
          : `<p>Email <strong>${email}</strong> was not found or already unsubscribed.</p>`,
      lang,
    ),
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}
