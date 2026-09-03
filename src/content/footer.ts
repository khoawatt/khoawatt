import type { Locale } from "@/features/i18n/config";

import { contactDetails } from "./contact";
import { getTipContent, type TipContentView } from "./tip";

type LocalizedText = Readonly<Record<Locale, string>>;

export interface FooterSocialView {
  id: string;
  label: string;
  value: string;
  href?: string;
}

export interface FooterContentView {
  brand: {
    name: string;
    description: string;
  };
  navigationLabel: string;
  contactLabel: string;
  details: ReadonlyArray<FooterSocialView>;
  newsletter: {
    label: string;
    description: string;
    helper: string;
    placeholder: string;
    submit: string;
    unavailable: string;
    errors: Record<string, string>;
    aria: {
      formLabel: string;
      emailLabel: string;
      statusLive: string;
    };
  };
  bottom: {
    rights: string;
    backToTop: string;
  };
  tip: TipContentView;
  aria: {
    footerLabel: string;
  };
}

const footerCopy = {
  brand: {
    description: {
      en: "Portfolio of Quach Vo Anh Khoa — software engineer and full-stack developer building calm, dependable web products.",
      vi: "Portfolio của Quách Võ Anh Khoa — kỹ sư phần mềm và lập trình viên full-stack xây dựng những sản phẩm web gần gũi và đáng tin cậy.",
    },
  },
  navigationLabel: {
    en: "Navigation",
    vi: "Điều hướng",
  },
  contactLabel: {
    en: "Contact",
    vi: "Liên hệ",
  },
  newsletter: {
    label: {
      en: "Newsletter",
      vi: "Bản tin",
    },
    description: {
      en: "Get occasional updates on new projects and experiments.",
      vi: "Nhận tin cập nhật định kỳ về dự án và thử nghiệm mới.",
    },
    helper: {
      en: "Sign-up is not active yet — your email will not be sent or stored.",
      vi: "Đăng ký chưa được mở — email của bạn sẽ không được gửi hoặc lưu trữ.",
    },
    placeholder: {
      en: "you@example.com",
      vi: "you@example.com",
    },
    submit: {
      en: "Subscribe",
      vi: "Đăng ký",
    },
    unavailable: {
      en: "Newsletter sign-up is not available yet — your email has not been sent or stored.",
      vi: "Đăng ký bản tin hiện chưa được mở — email của bạn chưa được gửi hoặc lưu trữ.",
    },
    errors: {
      required: {
        en: "Please enter your email address.",
        vi: "Vui lòng nhập địa chỉ email.",
      },
      "invalid-email": {
        en: "Please enter a valid email address.",
        vi: "Vui lòng nhập địa chỉ email hợp lệ.",
      },
      "too-long": {
        en: "This email address is too long.",
        vi: "Địa chỉ email này quá dài.",
      },
    },
    aria: {
      formLabel: {
        en: "Newsletter sign-up",
        vi: "Đăng ký bản tin",
      },
      emailLabel: {
        en: "Email address",
        vi: "Địa chỉ email",
      },
      statusLive: {
        en: "Newsletter sign-up status",
        vi: "Trạng thái đăng ký bản tin",
      },
    },
  },
  bottom: {
    rights: {
      en: "All rights reserved.",
      vi: "Bảo lưu mọi quyền.",
    },
    backToTop: {
      en: "Back to top",
      vi: "Về đầu trang",
    },
  },
  aria: {
    footerLabel: {
      en: "Footer",
      vi: "Chân trang",
    },
  },
} as const;

export function getFooterContent(locale: Locale): FooterContentView {
  const localized = (text: LocalizedText) => text[locale];

  return {
    brand: {
      name: "Quach Vo Anh Khoa",
      description: localized(footerCopy.brand.description),
    },
    navigationLabel: localized(footerCopy.navigationLabel),
    contactLabel: localized(footerCopy.contactLabel),
    details: Object.values(contactDetails).map((detail) => ({
      id: detail.id,
      label: localized(detail.label),
      value: localized(detail.value),
      href: "href" in detail ? detail.href : undefined,
    })),
    newsletter: {
      label: localized(footerCopy.newsletter.label),
      description: localized(footerCopy.newsletter.description),
      helper: localized(footerCopy.newsletter.helper),
      placeholder: localized(footerCopy.newsletter.placeholder),
      submit: localized(footerCopy.newsletter.submit),
      unavailable: localized(footerCopy.newsletter.unavailable),
      errors: Object.fromEntries(
        Object.entries(footerCopy.newsletter.errors).map(([key, value]) => [
          key,
          localized(value),
        ]),
      ),
      aria: {
        formLabel: localized(footerCopy.newsletter.aria.formLabel),
        emailLabel: localized(footerCopy.newsletter.aria.emailLabel),
        statusLive: localized(footerCopy.newsletter.aria.statusLive),
      },
    },
    bottom: {
      rights: localized(footerCopy.bottom.rights),
      backToTop: localized(footerCopy.bottom.backToTop),
    },
    tip: getTipContent(locale),
    aria: {
      footerLabel: localized(footerCopy.aria.footerLabel),
    },
  };
}
