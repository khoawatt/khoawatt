import type { Locale } from "@/features/i18n/config";

type LocalizedText = Readonly<Record<Locale, string>>;

export type TipPlatform = "buymeacoffee" | "kofi" | "momo";

export interface TipLinkView {
  id: TipPlatform;
  label: string;
  href: string;
}

export interface TipContentView {
  label: string;
  ariaLabel: string;
  links: ReadonlyArray<TipLinkView>;
}

/**
 * Static tip / donation links.
 *
 * Placeholders: replace hrefs with the owner's real URLs before launch.
 * - Buy Me a Coffee / Ko-fi: plain https profile URLs.
 * - MoMo / ZaloPay: Vietnamese e-wallets typically share via QR or deep link;
 *   keep an https landing here (e.g. me.momo.vn/<handle>) and update when ready.
 */
const tipCopy = {
  label: {
    en: "Feel it useful? Tip me:",
    vi: "Thấy hữu ích? Ủng hộ mình nhé:",
  } satisfies LocalizedText,
  ariaLabel: {
    en: "Support links",
    vi: "Liên kết ủng hộ",
  } satisfies LocalizedText,
  platforms: {
    buymeacoffee: {
      label: {
        en: "Buy Me a Coffee",
        vi: "Buy Me a Coffee",
      } satisfies LocalizedText,
      // TODO: replace with real handle
      href: "https://www.buymeacoffee.com/khoawatt",
    },
    kofi: {
      label: { en: "Ko-fi", vi: "Ko-fi" } satisfies LocalizedText,
      // TODO: replace with real handle
      href: "https://ko-fi.com/khoawatt",
    },
    momo: {
      label: { en: "MoMo", vi: "MoMo" } satisfies LocalizedText,
      href: "/images/tip/momo-qr.jpg",
    },
  },
} as const;

const tipOrder: readonly TipPlatform[] = ["buymeacoffee", "kofi", "momo"];

export function getTipContent(locale: Locale): TipContentView {
  const localized = (text: LocalizedText) => text[locale];

  return {
    label: localized(tipCopy.label),
    ariaLabel: localized(tipCopy.ariaLabel),
    links: tipOrder.map((id) => ({
      id,
      label: localized(tipCopy.platforms[id].label),
      href: tipCopy.platforms[id].href,
    })),
  };
}

export const tipLinksConfig = tipCopy;
