import type { Locale } from "@/features/i18n/config";

type LocalizedText = Readonly<Record<Locale, string>>;

export type ResumeCategory = "career-journey" | "education-certifications";

export interface ResumeMedia {
  id: string;
  thumbnailSrc: string;
  fullSrc: string;
  alt: LocalizedText;
  caption?: LocalizedText;
  width?: number;
  height?: number;
}

export interface ResumeEntry {
  id: string;
  category: ResumeCategory;
  title: LocalizedText;
  organization?: LocalizedText;
  location?: LocalizedText;
  dateLabel?: LocalizedText;
  summary?: LocalizedText;
  highlights?: ReadonlyArray<LocalizedText>;
  tags?: ReadonlyArray<LocalizedText>;
  media?: ReadonlyArray<ResumeMedia>;
  links?: ReadonlyArray<{ label: LocalizedText; href: string }>;
  order: number;
}

export interface ResumeMediaView {
  id: string;
  thumbnailSrc: string;
  fullSrc: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ResumeEntryView {
  id: string;
  index: string;
  title: string;
  organization?: string;
  location?: string;
  dateLabel?: string;
  summary?: string;
  highlights?: ReadonlyArray<string>;
  tags?: ReadonlyArray<string>;
  media?: ReadonlyArray<ResumeMediaView>;
  links?: ReadonlyArray<{ label: string; href: string }>;
}

export interface ResumeCategoryView {
  id: ResumeCategory;
  name: string;
  entries: ReadonlyArray<ResumeEntryView>;
}

export interface ResumeContentView {
  eyebrow: string;
  title: string;
  description: string;
  categoriesLabel: string;
  previousEntry: string;
  nextEntry: string;
  entryCounter: string;
  viewImage: string;
  closeLightbox: string;
  lightboxLabel: string;
  categories: ReadonlyArray<ResumeCategoryView>;
}

/**
 * Public-safe strings only — no categories, entries, media, or links.
 * Rendered by a server component when the resume section is private, so no
 * sensitive content ever reaches the client RSC payload.
 */
export interface ResumeLockContentView {
  eyebrow: string;
  title: string;
  description: string;
  privateTitle: string;
  privateMessage: string;
}

export const resumeEntries = [
  {
    id: "fullstack-maintenance",
    category: "career-journey",
    title: {
      en: "Full-stack development and maintenance",
      vi: "Phát triển và bảo trì full-stack",
    },
    organization: {
      en: "Dynamic Global Solutions",
      vi: "Dynamic Global Solutions",
    },
    dateLabel: {
      en: "2024 – Present",
      vi: "2024 – Hiện tại",
    },
    summary: {
      en: "Full-stack development and maintenance for products including QR food ordering and real-time chat. The company focuses on outsourced projects for international clients.",
      vi: "Phát triển và bảo trì full-stack cho các sản phẩm bao gồm gọi món bằng QR và chat thời gian thực. Công ty chuyên về các dự án gia công cho khách hàng quốc tế.",
    },
    highlights: [
      {
        en: "Product development across backend and frontend",
        vi: "Phát triển sản phẩm trên cả backend lẫn frontend",
      },
      {
        en: "Ongoing maintenance of shipped products",
        vi: "Bảo trì liên tục các sản phẩm đã đưa vào vận hành",
      },
    ],
    tags: [
      { en: "Full-stack", vi: "Full-stack" },
      { en: "Real-time chat", vi: "Chat thời gian thực" },
      { en: "QR ordering", vi: "Gọi món bằng QR" },
    ],
    order: 1,
  },
  {
    id: "backend-lms",
    category: "career-journey",
    title: {
      en: "Backend work on a learning management system",
      vi: "Làm backend cho hệ thống quản lý học tập",
    },
    organization: {
      en: "EnglishWing",
      vi: "EnglishWing",
    },
    dateLabel: {
      en: "2024",
      vi: "2024",
    },
    summary: {
      en: "Backend work on a learning management system at an EdTech company offering English learning platforms, with frontend and DevOps collaboration.",
      vi: "Làm backend cho hệ thống quản lý học tập tại một công ty EdTech cung cấp nền tảng học tiếng Anh, phối hợp frontend và DevOps.",
    },
    highlights: [
      {
        en: "Backend development for an LMS",
        vi: "Phát triển backend cho hệ thống LMS",
      },
      {
        en: "Collaborated across frontend and DevOps",
        vi: "Phối hợp với frontend và DevOps",
      },
    ],
    tags: [
      { en: "Backend", vi: "Backend" },
      { en: "LMS", vi: "LMS" },
      { en: "DevOps", vi: "DevOps" },
    ],
    media: [
      {
        id: "englishwing-employment-confirmation",
        thumbnailSrc: "/api/resume-media/englishwing-employment-thumb.jpg",
        fullSrc: "/api/resume-media/englishwing-employment.jpg",
        alt: {
          en: "EnglishWing employment confirmation document",
          vi: "Giấy xác nhận làm việc tại EnglishWing",
        },
        caption: {
          en: "EnglishWing employment confirmation",
          vi: "Xác nhận làm việc tại EnglishWing",
        },
        width: 1600,
        height: 2133,
      },
    ],
    order: 2,
  },
  {
    id: "vehicle-booking-fullstack",
    category: "career-journey",
    title: {
      en: "Full-stack work on vehicle booking and management",
      vi: "Làm full-stack cho hệ thống đặt và quản lý xe",
    },
    organization: {
      en: "SmartIT",
      vi: "SmartIT",
    },
    dateLabel: {
      en: "2023",
      vi: "2023",
    },
    summary: {
      en: "Full-stack work on vehicle booking and management for the Japanese market. Maintained the backend, optimized APIs, and worked on frontend features and debugging.",
      vi: "Làm full-stack cho hệ thống đặt và quản lý xe phục vụ thị trường Nhật Bản. Bảo trì backend, tối ưu API và làm các tính năng frontend cùng debug.",
    },
    highlights: [
      {
        en: "Vehicle booking and management product",
        vi: "Sản phẩm đặt và quản lý xe",
      },
      {
        en: "Built for the Japanese market",
        vi: "Xây dựng cho thị trường Nhật Bản",
      },
    ],
    tags: [
      { en: "Full-stack", vi: "Full-stack" },
      { en: "Vehicle booking", vi: "Đặt xe" },
      { en: "Japan market", vi: "Thị trường Nhật Bản" },
    ],
    order: 3,
  },
  {
    id: "wordpress-seo-development",
    category: "career-journey",
    title: {
      en: "WordPress and SEO development",
      vi: "Phát triển WordPress và SEO",
    },
    organization: {
      en: "Zenitech",
      vi: "Zenitech",
    },
    dateLabel: {
      en: "2020 – 2023",
      vi: "2020 – 2023",
    },
    summary: {
      en: "WordPress and SEO development at an agency serving local and global clients. Starting point in tech, covering layout customization, LCP/CLS optimization, and Google Ads.",
      vi: "Phát triển WordPress và SEO tại một agency phục vụ khách hàng trong nước và quốc tế. Điểm khởi đầu trong ngành công nghệ, gồm tùy chỉnh layout, tối ưu LCP/CLS và Google Ads.",
    },
    highlights: [
      {
        en: "WordPress and SEO development",
        vi: "Phát triển WordPress và SEO",
      },
      {
        en: "Performance optimization and Google Ads",
        vi: "Tối ưu hiệu năng và Google Ads",
      },
    ],
    tags: [
      { en: "WordPress", vi: "WordPress" },
      { en: "SEO", vi: "SEO" },
      { en: "Google Ads", vi: "Google Ads" },
    ],
    order: 4,
  },
  {
    id: "bachelor-electronics-telecommunications",
    category: "education-certifications",
    title: {
      en: "Bachelor's degree",
      vi: "Bằng cử nhân",
    },
    organization: {
      en: "University of Science, VNU-HCM",
      vi: "Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM",
    },
    dateLabel: {
      en: "2018 – 2023",
      vi: "2018 – 2023",
    },
    summary: {
      en: "Electronics–Telecommunications Engineering, graduated with Good classification.",
      vi: "Kỹ thuật Điện tử–Viễn thông, tốt nghiệp loại Khá.",
    },
    highlights: [
      {
        en: "Good classification",
        vi: "Xếp loại Khá",
      },
      {
        en: "GPA 7.72",
        vi: "GPA 7.72",
      },
    ],
    tags: [
      { en: "Electronics", vi: "Điện tử" },
      { en: "Telecommunications", vi: "Viễn thông" },
    ],
    media: [
      {
        id: "bachelor-degree-certificate",
        thumbnailSrc: "/api/resume-media/bachelor-degree-thumb.jpg",
        fullSrc: "/api/resume-media/bachelor-degree.jpg",
        alt: {
          en: "Bachelor's degree certificate in Electronics–Telecommunications Engineering issued by the University of Science, VNU-HCM",
          vi: "Bằng cử nhân Kỹ thuật Điện tử–Viễn thông do Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM cấp",
        },
        caption: {
          en: "Bachelor's degree certificate",
          vi: "Bằng cử nhân",
        },
        width: 1600,
        height: 1200,
      },
      {
        id: "academic-transcript",
        thumbnailSrc: "/api/resume-media/transcript-thumb.jpg",
        fullSrc: "/api/resume-media/transcript.jpg",
        alt: {
          en: "Academic transcript from the University of Science, VNU-HCM",
          vi: "Bảng điểm của Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM",
        },
        caption: {
          en: "Academic transcript",
          vi: "Bảng điểm",
        },
        width: 1600,
        height: 2133,
      },
    ],
    order: 1,
  },
  {
    id: "toeic",
    category: "education-certifications",
    title: {
      en: "TOEIC",
      vi: "TOEIC",
    },
    organization: {
      en: "Recorded scores: Listening & Reading 775, Speaking & Writing 330",
      vi: "Điểm ghi nhận: Nghe & Đọc 775, Nói & Viết 330",
    },
    summary: {
      en: "English proficiency assessment recorded in the legacy resume.",
      vi: "Kết quả đánh giá tiếng Anh được ghi nhận trong hồ sơ cũ.",
    },
    tags: [
      { en: "English", vi: "Tiếng Anh" },
      { en: "TOEIC", vi: "TOEIC" },
    ],
    media: [
      {
        id: "toeic-certificate",
        thumbnailSrc: "/api/resume-media/toeic-thumb.jpg",
        fullSrc: "/api/resume-media/toeic.jpg",
        alt: {
          en: "TOEIC certificates recording Listening & Reading 775 and Speaking & Writing 330",
          vi: "Chứng chỉ TOEIC ghi nhận điểm Nghe & Đọc 775 và Nói & Viết 330",
        },
        caption: {
          en: "TOEIC certificates",
          vi: "Chứng chỉ TOEIC",
        },
        width: 1600,
        height: 1263,
      },
    ],
    order: 2,
  },
  {
    id: "basic-it-application-certificate",
    category: "education-certifications",
    title: {
      en: "Basic IT Application Certificate",
      vi: "Chứng chỉ Ứng dụng CNTT cơ bản",
    },
    organization: {
      en: "University of Science IT Center",
      vi: "Trung tâm Tin học, Trường Đại học Khoa học Tự nhiên",
    },
    dateLabel: {
      en: "2019",
      vi: "2019",
    },
    summary: {
      en: "Recorded results: theory 8.3, practical 9.7.",
      vi: "Kết quả ghi nhận: lý thuyết 8.3, thực hành 9.7.",
    },
    highlights: [
      {
        en: "Theory 8.3 · Practical 9.7",
        vi: "Lý thuyết 8.3 · Thực hành 9.7",
      },
    ],
    tags: [
      { en: "IT", vi: "CNTT" },
      { en: "Certificate", vi: "Chứng chỉ" },
    ],
    media: [
      {
        id: "basic-it-application-certificate",
        thumbnailSrc: "/api/resume-media/basic-it-application-thumb.jpg",
        fullSrc: "/api/resume-media/basic-it-application.jpg",
        alt: {
          en: "Basic IT Application Certificate issued by the University of Science IT Center in 2019",
          vi: "Chứng chỉ Ứng dụng CNTT cơ bản do Trung tâm Tin học, Trường Đại học Khoa học Tự nhiên cấp năm 2019",
        },
        caption: {
          en: "Basic IT Application Certificate",
          vi: "Chứng chỉ Ứng dụng CNTT cơ bản",
        },
        width: 1600,
        height: 1090,
      },
    ],
    order: 3,
  },
  {
    id: "codeforces-profile",
    category: "education-certifications",
    title: {
      en: "Codeforces profile",
      vi: "Hồ sơ Codeforces",
    },
    organization: {
      en: "Rank: Expert · Handle: anhkhoaquachvo",
      vi: "Rank: Expert · Handle: anhkhoaquachvo",
    },
    summary: {
      en: "Competitive programming profile referenced in the legacy resume.",
      vi: "Hồ sơ lập trình thi đấu được nhắc đến trong hồ sơ cũ.",
    },
    highlights: [
      {
        en: "Competitive programming practice",
        vi: "Luyện tập lập trình thi đấu",
      },
    ],
    tags: [
      { en: "Competitive programming", vi: "Lập trình thi đấu" },
      { en: "Codeforces", vi: "Codeforces" },
    ],
    media: [
      {
        id: "codeforces-certificate",
        thumbnailSrc: "/api/resume-media/codeforces-thumb.jpg",
        fullSrc: "/api/resume-media/codeforces.jpg",
        alt: {
          en: "Codeforces certificate showing Expert rank for handle anhkhoaquachvo",
          vi: "Chứng chỉ Codeforces hiển thị rank Expert cho handle anhkhoaquachvo",
        },
        caption: {
          en: "Codeforces certificate — Expert",
          vi: "Chứng chỉ Codeforces — Expert",
        },
        width: 1603,
        height: 1002,
      },
    ],
    links: [
      {
        label: {
          en: "View Codeforces profile",
          vi: "Xem hồ sơ Codeforces",
        },
        href: "https://codeforces.com/profile/anhkhoaquachvo",
      },
    ],
    order: 4,
  },
] as const satisfies ReadonlyArray<ResumeEntry>;

const resumeCopy = {
  eyebrow: {
    en: "Career & education",
    vi: "Sự nghiệp & học vấn",
  },
  title: {
    en: "Resume",
    vi: "Hồ sơ",
  },
  description: {
    en: "A structured look at the roles, projects, and credentials that shaped the journey so far.",
    vi: "Tổng quan có cấu trúc về công việc, dự án và chứng chỉ đã định hình hành trình cho đến nay.",
  },
  categoriesLabel: {
    en: "Resume categories",
    vi: "Nhóm hồ sơ",
  },
  previousEntry: {
    en: "Previous entry",
    vi: "Mục trước",
  },
  nextEntry: {
    en: "Next entry",
    vi: "Mục tiếp theo",
  },
  entryCounter: {
    en: "Entry",
    vi: "Mục",
  },
  viewImage: {
    en: "View image",
    vi: "Xem hình",
  },
  closeLightbox: {
    en: "Close",
    vi: "Đóng",
  },
  lightboxLabel: {
    en: "Full-size image viewer",
    vi: "Trình xem hình kích thước đầy đủ",
  },
  privateMessage: {
    en: "Resume details are private. Request access to view the full career and education history.",
    vi: "Chi tiết hồ sơ hiện ở chế độ riêng tư. Hãy liên hệ để xem đầy đủ hành trình sự nghiệp và học vấn.",
  },
  privateTitle: {
    en: "Resume is private",
    vi: "Hồ sơ đang ở chế độ riêng tư",
  },
  categoryNames: {
    "career-journey": {
      en: "Career Journey",
      vi: "Hành trình sự nghiệp",
    },
    "education-certifications": {
      en: "Education & Certifications",
      vi: "Học vấn & Chứng chỉ",
    },
  },
} as const;

export function getResumeContent(locale: Locale): ResumeContentView {
  const localized = (text: LocalizedText) => text[locale];
  const categories: ResumeCategory[] = [
    "career-journey",
    "education-certifications",
  ];

  return {
    eyebrow: resumeCopy.eyebrow[locale],
    title: resumeCopy.title[locale],
    description: resumeCopy.description[locale],
    categoriesLabel: resumeCopy.categoriesLabel[locale],
    previousEntry: resumeCopy.previousEntry[locale],
    nextEntry: resumeCopy.nextEntry[locale],
    entryCounter: resumeCopy.entryCounter[locale],
    viewImage: resumeCopy.viewImage[locale],
    closeLightbox: resumeCopy.closeLightbox[locale],
    lightboxLabel: resumeCopy.lightboxLabel[locale],
    categories: categories.map((categoryId) => {
      const entries = (resumeEntries as ReadonlyArray<ResumeEntry>)
        .filter((entry) => entry.category === categoryId)
        .sort((left, right) => left.order - right.order);

      return {
        id: categoryId,
        name: resumeCopy.categoryNames[categoryId][locale],
        entries: entries.map((entry, index) => ({
          id: entry.id,
          index: String(index + 1).padStart(2, "0"),
          title: localized(entry.title),
          organization: entry.organization
            ? localized(entry.organization)
            : undefined,
          location: entry.location ? localized(entry.location) : undefined,
          dateLabel: entry.dateLabel ? localized(entry.dateLabel) : undefined,
          summary: entry.summary ? localized(entry.summary) : undefined,
          highlights: entry.highlights?.map(localized),
          tags: entry.tags?.map(localized),
          media: entry.media?.map((media) => ({
            id: media.id,
            thumbnailSrc: media.thumbnailSrc,
            fullSrc: media.fullSrc,
            alt: localized(media.alt),
            caption: media.caption ? localized(media.caption) : undefined,
            width: media.width,
            height: media.height,
          })),
          links: entry.links?.map((link) => ({
            label: localized(link.label),
            href: link.href,
          })),
        })),
      };
    }),
  };
}

/**
 * Returns only public-safe strings for the private lock state. Deliberately
 * never touches `resumeEntries`, so no employer name, link, or media path can
 * leak into the client payload while the resume is private.
 */
export function getResumeLockContent(locale: Locale): ResumeLockContentView {
  return {
    eyebrow: resumeCopy.eyebrow[locale],
    title: resumeCopy.title[locale],
    description: resumeCopy.description[locale],
    privateTitle: resumeCopy.privateTitle[locale],
    privateMessage: resumeCopy.privateMessage[locale],
  };
}
