import type { Locale } from "@/features/i18n/config";

type LocalizedText = Readonly<Record<Locale, string>>;

interface ProfileImage {
  src: string;
  width: number;
  height: number;
  alt: LocalizedText;
  focalPoint: string;
}

interface LocalizedProfileContent {
  role: LocalizedText;
  hero: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    actions: Readonly<Record<HeroActionId, LocalizedText>>;
  };
  about: {
    intro: LocalizedText;
  };
}

export type HeroActionId = "case-studies" | "discussion" | "resume";

interface HeroActionView {
  id: HeroActionId;
  label: string;
  href: "#projects" | "#contact" | "#resume";
}

export interface PortfolioProfileView {
  name: string;
  role: string;
  githubUrl: string;
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    actions: ReadonlyArray<HeroActionView>;
    image: Omit<ProfileImage, "alt"> & { alt: string };
  };
  about: {
    intro: string;
    portraits: ReadonlyArray<Omit<ProfileImage, "alt"> & { alt: string }>;
  };
}

export const portfolioProfile = {
  name: "Quach Vo Anh Khoa",
  githubUrl: "https://github.com/khoawatt",
  media: {
    hero: {
      src: "/images/profile/portrait-hero-banner.jpg",
      width: 852,
      height: 1280,
      focalPoint: "44% 42%",
      alt: {
        en: "Khoa in a patterned shirt, seated outdoors in profile",
        vi: "Khoa mặc áo họa tiết, ngồi ngoài trời và nhìn nghiêng",
      },
    },
    aboutPortraits: [
      {
        src: "/images/profile/portrait-slider-01.jpg",
        width: 734,
        height: 1280,
        focalPoint: "50% 43%",
        alt: {
          en: "Khoa wearing glasses while seated outdoors during the day",
          vi: "Khoa đeo kính, ngồi ngoài trời vào ban ngày",
        },
      },
      {
        src: "/images/profile/portrait-slider-02.jpg",
        width: 725,
        height: 1280,
        focalPoint: "50% 40%",
        alt: {
          en: "Khoa seated at an evening rooftop venue with the city behind him",
          vi: "Khoa ngồi tại một không gian sân thượng buổi tối với thành phố phía sau",
        },
      },
    ],
  },
} as const;

const localizedProfile = {
  role: {
    en: "Software engineer · Full-stack developer",
    vi: "Kỹ sư phần mềm · Lập trình viên full-stack",
  },
  hero: {
    eyebrow: {
      en: "A little about me",
      vi: "Đôi nét về mình",
    },
    title: {
      en: "Turning complex ideas into calm, useful experiences",
      vi: "Biến những ý tưởng phức tạp thành trải nghiệm gần gũi, hữu ích",
    },
    description: {
      en: "I shape dependable web products where useful engineering and considered design work together.",
      vi: "Mình xây dựng các sản phẩm web đáng tin cậy, nơi kỹ thuật hữu ích song hành cùng thiết kế có chủ đích.",
    },
    actions: {
      "case-studies": {
        en: "View Case Studies",
        vi: "Xem dự án tiêu biểu",
      },
      discussion: {
        en: "Technical Discussion",
        vi: "Trao đổi kỹ thuật",
      },
      resume: {
        en: "View Resume",
        vi: "Xem hồ sơ",
      },
    },
  },
  about: {
    intro: {
      en: "I am Khoa, a software engineer and full-stack developer focused on resilient systems, accessible interactions, and products that remain maintainable as they grow.",
      vi: "Mình là Khoa, một kỹ sư phần mềm và lập trình viên full-stack tập trung vào hệ thống bền vững, tương tác dễ tiếp cận và sản phẩm dễ phát triển lâu dài.",
    },
  },
} satisfies LocalizedProfileContent;

export function getPortfolioProfile(locale: Locale): PortfolioProfileView {
  const content = localizedProfile;

  return {
    name: portfolioProfile.name,
    role: content.role[locale],
    githubUrl: portfolioProfile.githubUrl,
    hero: {
      eyebrow: content.hero.eyebrow[locale],
      title: content.hero.title[locale],
      description: content.hero.description[locale],
      actions: [
        {
          id: "case-studies",
          label: content.hero.actions["case-studies"][locale],
          href: "#projects",
        },
        {
          id: "discussion",
          label: content.hero.actions.discussion[locale],
          href: "#contact",
        },
        {
          id: "resume",
          label: content.hero.actions.resume[locale],
          href: "#resume",
        },
      ],
      image: {
        ...portfolioProfile.media.hero,
        alt: portfolioProfile.media.hero.alt[locale],
      },
    },
    about: {
      intro: content.about.intro[locale],
      portraits: portfolioProfile.media.aboutPortraits.map((portrait) => ({
        ...portrait,
        alt: portrait.alt[locale],
      })),
    },
  };
}
