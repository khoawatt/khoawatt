import type { Locale } from "@/features/i18n/config";

type LocalizedText = Readonly<Record<Locale, string>>;

export type ContactFieldName = "name" | "email" | "subject" | "message";

export type SocialPlatform =
  | "facebook"
  | "github"
  | "instagram"
  | "linkedin"
  | "thread"
  | "x";

export interface SocialLinkView {
  id: SocialPlatform;
  label: string;
  href: string;
}

export interface ContactDetailView {
  id: string;
  label: string;
  value: string;
  href?: string;
}

export interface ContactContentView {
  eyebrow: string;
  title: string;
  description: string;
  detailsLabel: string;
  detailsHeading: string;
  formHeading: string;
  details: ReadonlyArray<ContactDetailView>;
  socials: ReadonlyArray<SocialLinkView>;
  form: {
    name: string;
    namePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    subject: string;
    subjectPlaceholder: string;
    message: string;
    messagePlaceholder: string;
    submit: string;
    submitting: string;
  };
  errors: Record<string, string>;
  status: {
    success: string;
    rejected: string;
    serverError: string;
    rateLimited: string;
  };
  aria: {
    formLabel: string;
    requiredNote: string;
    statusLive: string;
    honeypot: string;
  };
}

export const contactDetails = {
  email: {
    id: "email",
    label: { en: "Email", vi: "Email" },
    value: { en: "contact@khoawatt.com", vi: "contact@khoawatt.com" },
    href: "mailto:contact@khoawatt.com",
  },
  phone: {
    id: "phone",
    label: { en: "Phone", vi: "Điện thoại" },
    value: { en: "+84 704823238", vi: "+84 704823238" },
    href: "tel:+84704823238",
  },
  location: {
    id: "location",
    label: { en: "Location", vi: "Vị trí" },
    value: { en: "Ho Chi Minh, Vietnam", vi: "Hồ Chí Minh, Việt Nam" },
  },
} as const;

const socialDefaults: ReadonlyArray<{
  href: string;
  id: SocialPlatform;
  label: LocalizedText;
}> = [
  {
    id: "facebook",
    label: { en: "Facebook", vi: "Facebook" },
    href: "#",
  },
  {
    id: "instagram",
    label: { en: "Instagram", vi: "Instagram" },
    href: "#",
  },
  {
    id: "github",
    label: { en: "GitHub", vi: "GitHub" },
    href: "https://github.com/Akbi47",
  },
  {
    id: "x",
    label: { en: "X", vi: "X" },
    href: "#",
  },
  {
    id: "linkedin",
    label: { en: "LinkedIn", vi: "LinkedIn" },
    href: "#",
  },
  {
    id: "thread",
    label: { en: "Threads", vi: "Threads" },
    href: "https://www.threads.com/khoawatt",
  },
];

const contactCopy = {
  eyebrow: {
    en: "Get in touch",
    vi: "Liên hệ",
  },
  title: {
    en: "Contact",
    vi: "Liên hệ",
  },
  description: {
    en: "Questions, ideas, or collaboration — the form sends a message straight to my inbox.",
    vi: "Thắc mắc, ý tưởng hay hợp tác — biểu mẫu gửi tin nhắn thẳng đến hộp thư của mình.",
  },
  detailsLabel: {
    en: "Find me on",
    vi: "Kết nối với mình",
  },
  detailsHeading: {
    en: "Contact details",
    vi: "Thông tin liên hệ",
  },
  formHeading: {
    en: "Send me a message",
    vi: "Gửi tin nhắn cho mình",
  },
  form: {
    name: { en: "Name", vi: "Họ tên" },
    namePlaceholder: { en: "Your name", vi: "Tên của bạn" },
    email: { en: "Email", vi: "Email" },
    emailPlaceholder: { en: "you@example.com", vi: "you@example.com" },
    subject: { en: "Subject", vi: "Tiêu đề" },
    subjectPlaceholder: { en: "What is this about?", vi: "Về vấn đề gì?" },
    message: { en: "Message", vi: "Nội dung" },
    messagePlaceholder: {
      en: "Write your message here…",
      vi: "Viết nội dung tại đây…",
    },
    submit: { en: "Send Message", vi: "Gửi tin nhắn" },
    submitting: { en: "Sending…", vi: "Đang gửi…" },
  },
  errors: {
    required: { en: "This field is required.", vi: "Trường này là bắt buộc." },
    "too-short": {
      en: "This value is too short.",
      vi: "Giá trị này quá ngắn.",
    },
    "too-long": {
      en: "This value is too long.",
      vi: "Giá trị này quá dài.",
    },
    "invalid-email": {
      en: "Please enter a valid email address.",
      vi: "Vui lòng nhập địa chỉ email hợp lệ.",
    },
  },
  status: {
    success: {
      en: "Your message was sent. Thank you!",
      vi: "Tin nhắn của bạn đã được gửi. Cảm ơn bạn!",
    },
    rejected: {
      en: "Your message could not be sent. Please try again.",
      vi: "Không thể gửi tin nhắn. Vui lòng thử lại.",
    },
    serverError: {
      en: "Something went wrong while sending your message. Please try again later.",
      vi: "Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại sau.",
    },
    rateLimited: {
      en: "Too many messages from this device. Please wait a while and try again.",
      vi: "Quá nhiều tin nhắn từ thiết bị này. Vui lòng chờ một lúc rồi thử lại.",
    },
  },
  aria: {
    formLabel: { en: "Contact form", vi: "Biểu mẫu liên hệ" },
    requiredNote: {
      en: "Fields marked with an asterisk are required.",
      vi: "Các trường có dấu hoa thị là bắt buộc.",
    },
    statusLive: {
      en: "Form submission status",
      vi: "Trạng thái gửi biểu mẫu",
    },
    honeypot: {
      en: "Leave this field empty",
      vi: "Để trống trường này",
    },
  },
} as const;

export function getContactContent(locale: Locale): ContactContentView {
  const localized = (text: LocalizedText) => text[locale];

  return {
    eyebrow: localized(contactCopy.eyebrow),
    title: localized(contactCopy.title),
    description: localized(contactCopy.description),
    detailsLabel: localized(contactCopy.detailsLabel),
    detailsHeading: localized(contactCopy.detailsHeading),
    formHeading: localized(contactCopy.formHeading),
    details: Object.values(contactDetails).map((detail) => ({
      id: detail.id,
      label: localized(detail.label),
      value: localized(detail.value),
      href: "href" in detail ? detail.href : undefined,
    })),
    socials: socialDefaults.map((social) => ({
      id: social.id,
      label: localized(social.label),
      href: social.href,
    })),
    form: {
      name: localized(contactCopy.form.name),
      namePlaceholder: localized(contactCopy.form.namePlaceholder),
      email: localized(contactCopy.form.email),
      emailPlaceholder: localized(contactCopy.form.emailPlaceholder),
      subject: localized(contactCopy.form.subject),
      subjectPlaceholder: localized(contactCopy.form.subjectPlaceholder),
      message: localized(contactCopy.form.message),
      messagePlaceholder: localized(contactCopy.form.messagePlaceholder),
      submit: localized(contactCopy.form.submit),
      submitting: localized(contactCopy.form.submitting),
    },
    errors: Object.fromEntries(
      Object.entries(contactCopy.errors).map(([key, value]) => [
        key,
        localized(value),
      ]),
    ),
    status: {
      success: localized(contactCopy.status.success),
      rejected: localized(contactCopy.status.rejected),
      serverError: localized(contactCopy.status.serverError),
      rateLimited: localized(contactCopy.status.rateLimited),
    },
    aria: {
      formLabel: localized(contactCopy.aria.formLabel),
      requiredNote: localized(contactCopy.aria.requiredNote),
      statusLive: localized(contactCopy.aria.statusLive),
      honeypot: localized(contactCopy.aria.honeypot),
    },
  };
}
