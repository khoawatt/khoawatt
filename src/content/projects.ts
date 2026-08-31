import type { Locale } from "@/features/i18n/config";

type LocalizedText = Readonly<Record<Locale, string>>;

export interface ProjectMedia {
  id: string;
  src: string;
  alt: LocalizedText;
  width: number;
  height: number;
  focalPoint: string;
  order: number;
}

export interface Project {
  id: string;
  slug: string;
  title: LocalizedText;
  category: LocalizedText;
  summary: LocalizedText;
  techStack: ReadonlyArray<string>;
  media: ReadonlyArray<ProjectMedia>;
  liveDemoUrl?: string;
  codeUrl?: string;
  featured: boolean;
  order: number;
  highlights?: ReadonlyArray<LocalizedText>;
}

export interface ProjectMediaView {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  focalPoint: string;
}

export interface ProjectView {
  id: string;
  index: string;
  title: string;
  category: string;
  summary: string;
  techStack: ReadonlyArray<string>;
  media: ReadonlyArray<ProjectMediaView>;
  liveDemoUrl?: string;
  codeUrl?: string;
  highlights?: ReadonlyArray<string>;
}

export interface FeaturedProjectsView {
  eyebrow: string;
  title: string;
  description: string;
  selectorLabel: string;
  previousImage: string;
  nextImage: string;
  imageCounter: string;
  liveDemo: string;
  code: string;
  projects: ReadonlyArray<ProjectView>;
}

export const projects = [
  {
    id: "atm-seeking",
    slug: "atm-seeking",
    title: {
      en: "ATM Seeking",
      vi: "ATM Seeking",
    },
    category: {
      en: "Navigation & mapping",
      vi: "Điều hướng và bản đồ",
    },
    summary: {
      en: "A web application that helps people find ATMs near their location, filter by type and distance, and leave useful reviews.",
      vi: "Ứng dụng web giúp mọi người tìm cây ATM gần vị trí hiện tại, lọc theo loại và khoảng cách, cùng đánh giá hữu ích.",
    },
    techStack: ["TypeScript", "Next.js", "Firebase", "Google Maps API", "NextAuth"],
    media: [
      {
        id: "atm-seeking-main",
        src: "/images/projects/atm-seeking-main.jpg",
        alt: {
          en: "ATM Seeking — a green ATM illustration on a light blue background",
          vi: "ATM Seeking — hình minh họa cây ATM màu xanh trên nền xanh nhạt",
        },
        width: 800,
        height: 389,
        focalPoint: "50% 50%",
        order: 1,
      },
      {
        id: "atm-seeking-demo",
        src: "/images/projects/atm-seeking-demo.jpg",
        alt: {
          en: "ATM Seeking interface showing the map, nearby ATMs, filters, and reviews",
          vi: "Giao diện ATM Seeking hiển thị bản đồ, cây ATM gần đó, bộ lọc và đánh giá",
        },
        width: 1432,
        height: 3648,
        focalPoint: "50% 4%",
        order: 2,
      },
    ],
    featured: true,
    order: 1,
    highlights: [
      {
        en: "Locates the user and maps nearby ATMs with Google Maps",
        vi: "Xác định vị trí người dùng và hiển thị cây ATM gần đó với Google Maps",
      },
      {
        en: "Filters ATMs by type, distance, and rating",
        vi: "Lọc ATM theo loại, khoảng cách và đánh giá",
      },
      {
        en: "Rating and review system with authenticated accounts",
        vi: "Hệ thống đánh giá và nhận xét với tài khoản xác thực",
      },
    ],
  },
  {
    id: "readingtime",
    slug: "readingtime",
    title: {
      en: "ReadingTime",
      vi: "ReadingTime",
    },
    category: {
      en: "EdTech · LMS",
      vi: "EdTech · LMS",
    },
    summary: {
      en: "A learning management system for 1-on-1 English lessons, managing courses, schedules, and student progress through live video.",
      vi: "Hệ thống quản lý học tập cho các buổi học tiếng Anh 1-1, quản lý khóa học, lịch học và tiến độ của học viên qua video trực tiếp.",
    },
    techStack: ["React", "NestJS", "MongoDB", "Redis", "Zoom SDK"],
    media: [
      {
        id: "readingtime-main",
        src: "/images/projects/readingtime.jpg",
        alt: {
          en: "ReadingTime — an open book with a pink Reading Time badge",
          vi: "ReadingTime — cuốn sách mở với huy hiệu Reading Time màu hồng",
        },
        width: 800,
        height: 800,
        focalPoint: "50% 50%",
        order: 1,
      },
    ],
    featured: true,
    order: 2,
    highlights: [
      {
        en: "Live 1-on-1 classes powered by the Zoom SDK",
        vi: "Lớp học 1-1 trực tiếp tích hợp Zoom SDK",
      },
      {
        en: "Curated reading curriculum with trial and premium flows",
        vi: "Giáo trình đọc sách có lộ trình dùng thử và cao cấp",
      },
      {
        en: "Dashboards for scheduling and tracking study progress",
        vi: "Bảng điều khiển lịch học và theo dõi tiến độ học tập",
      },
    ],
  },
  {
    id: "comestic-beauty-store",
    slug: "comestic-beauty-store",
    title: {
      en: "Comestic & Beauty Store",
      vi: "Cửa hàng mỹ phẩm & làm đẹp",
    },
    category: {
      en: "E-commerce · Health & beauty",
      vi: "Thương mại điện tử · Sức khỏe & làm đẹp",
    },
    summary: {
      en: "A responsive e-commerce website for beauty and skincare products with browsing, filtering, and a full checkout flow.",
      vi: "Website thương mại điện tử responsive cho mỹ phẩm và sản phẩm chăm sóc da với duyệt, lọc và luồng thanh toán hoàn chỉnh.",
    },
    techStack: ["WordPress", "WooCommerce", "Flatsome", "Elementor", "MySQL"],
    media: [
      {
        id: "comestic-beauty-store-main",
        src: "/images/projects/comestic-beauty-store.jpg",
        alt: {
          en: "A cosmetics store interior with glowing promotional displays and product shelves",
          vi: "Nội thất cửa hàng mỹ phẩm với màn hình quảng cáo sáng và kệ sản phẩm",
        },
        width: 800,
        height: 563,
        focalPoint: "50% 45%",
        order: 1,
      },
    ],
    liveDemoUrl: "https://www.youtube.com/watch?v=f3NrpMbqwV4",
    featured: true,
    order: 3,
    highlights: [
      {
        en: "Product catalog with filters by category and brand",
        vi: "Danh mục sản phẩm lọc theo danh mục và thương hiệu",
      },
      {
        en: "Cart, checkout, and order management with WooCommerce",
        vi: "Giỏ hàng, thanh toán và quản lý đơn hàng với WooCommerce",
      },
      {
        en: "Reviews, promotions, and social sharing built in",
        vi: "Tích hợp đánh giá, chương trình khuyến mãi và chia sẻ mạng xã hội",
      },
    ],
  },
  {
    id: "bakery-store",
    slug: "bakery-store",
    title: {
      en: "Bakery Store",
      vi: "Cửa hàng bánh",
    },
    category: {
      en: "E-commerce · Food & beverage",
      vi: "Thương mại điện tử · Thực phẩm & đồ uống",
    },
    summary: {
      en: "An online store for home bakers and pastry chefs to find baking ingredients, tools, and decorating supplies.",
      vi: "Cửa hàng trực tuyến cho thợ làm bánh tại nhà và đầu bếp bánh ngọt với nguyên liệu, dụng cụ và phụ kiện trang trí.",
    },
    techStack: ["WordPress", "WooCommerce", "Flatsome", "UX Builder", "MySQL"],
    media: [
      {
        id: "bakery-store-main",
        src: "/images/projects/bakery-store.jpg",
        alt: {
          en: "A strawberry layer cake with a cut slice showing pink cake layers",
          vi: "Bánh kem dâu với một phần cắt lộ lớp bánh màu hồng",
        },
        width: 800,
        height: 533,
        focalPoint: "52% 45%",
        order: 1,
      },
    ],
    liveDemoUrl: "https://youtu.be/4O9kGRFmXVY",
    featured: true,
    order: 4,
    highlights: [
      {
        en: "Product catalog with filters by category and brand",
        vi: "Danh mục sản phẩm lọc theo danh mục và thương hiệu",
      },
      {
        en: "Newsletter, blog, and contact tools included",
        vi: "Bao gồm newsletter, blog và công cụ liên hệ",
      },
      {
        en: "Mobile-optimized navigation and shopping flow",
        vi: "Điều hướng và luồng mua sắm tối ưu trên di động",
      },
    ],
  },
  {
    id: "dynamic-global-solution-landing-page",
    slug: "dynamic-global-solution-landing-page",
    title: {
      en: "Technology Services Landing Page",
      vi: "Landing page dịch vụ công nghệ",
    },
    category: {
      en: "Web · Technology services",
      vi: "Web · Dịch vụ công nghệ",
    },
    summary: {
      en: "A performance-focused landing page for a technology services company offering cloud, software, and cybersecurity services.",
      vi: "Landing page tập trung hiệu năng cho một công ty dịch vụ công nghệ cung cấp dịch vụ cloud, phần mềm và an ninh mạng.",
    },
    techStack: ["WordPress", "Elementor", "Contact Form 7", "Yoast SEO"],
    media: [
      {
        id: "dgs-landing-main",
        src: "/images/projects/dgs-landing.webp",
        alt: {
          en: "Technology services landing page hero section with a professional at a desk and a glowing globe",
          vi: "Phần hero của landing page dịch vụ công nghệ với chuyên gia làm việc tại bàn và quả địa cầu phát sáng",
        },
        width: 1792,
        height: 1024,
        focalPoint: "50% 55%",
        order: 1,
      },
    ],
    liveDemoUrl: "https://www.youtube.com/watch?v=BU1RvITWoi8",
    codeUrl: "https://github.com/khoawatt/Feaon-ldp-v2",
    featured: true,
    order: 5,
    highlights: [
      {
        en: "Hero, services, testimonials, FAQ, and call-to-action sections",
        vi: "Các phần hero, dịch vụ, đánh giá, FAQ và lời kêu gọi hành động",
      },
      {
        en: "Search-engine and performance optimization",
        vi: "Tối ưu công cụ tìm kiếm và hiệu năng",
      },
      {
        en: "Fully responsive layout from mobile to desktop",
        vi: "Bố cục responsive hoàn chỉnh từ di động đến máy tính",
      },
    ],
  },
  {
    id: "scented-candles-store",
    slug: "scented-candles-store",
    title: {
      en: "Scented Candles Store",
      vi: "Cửa hàng nến thơm",
    },
    category: {
      en: "E-commerce · Lifestyle",
      vi: "Thương mại điện tử · Phong cách sống",
    },
    summary: {
      en: "A store for candle lovers to discover handcrafted scented candles for relaxation, ambiance, and gifting.",
      vi: "Cửa hàng cho người yêu nến khám phá nến thơm thủ công để thư giãn, tạo không gian và làm quà tặng.",
    },
    techStack: ["WordPress", "WooCommerce", "Flatsome", "ACF", "MySQL"],
    media: [
      {
        id: "scented-candles-store-main",
        src: "/images/projects/scented-candles-store.webp",
        alt: {
          en: "A lit Fenwick candles glass jar beside wooden matches on a table",
          vi: "Lọ nến Fenwick đang cháy cạnh que diêm gỗ trên bàn",
        },
        width: 1200,
        height: 641,
        focalPoint: "50% 45%",
        order: 1,
      },
    ],
    liveDemoUrl: "https://youtu.be/WD_NulE5_l4",
    featured: true,
    order: 6,
    highlights: [
      {
        en: "Product catalog with filters by category and brand",
        vi: "Danh mục sản phẩm lọc theo danh mục và thương hiệu",
      },
      {
        en: "Reviews, promotions, and social sharing built in",
        vi: "Tích hợp đánh giá, chương trình khuyến mãi và chia sẻ mạng xã hội",
      },
      {
        en: "Mobile-optimized navigation and shopping flow",
        vi: "Điều hướng và luồng mua sắm tối ưu trên di động",
      },
    ],
  },
] as const satisfies ReadonlyArray<Project>;

const projectCopy = {
  eyebrow: {
    en: "Selected work",
    vi: "Dự án tiêu biểu",
  },
  title: {
    en: "Featured projects",
    vi: "Dự án nổi bật",
  },
  description: {
    en: "A focused set of products I designed and built end to end, with live demos and source code where available.",
    vi: "Một nhóm sản phẩm mình thiết kế và xây dựng trọn vẹn, kèm bản demo và mã nguồn nếu có.",
  },
  selectorLabel: {
    en: "Featured projects",
    vi: "Dự án nổi bật",
  },
  previousImage: {
    en: "Previous image",
    vi: "Ảnh trước",
  },
  nextImage: {
    en: "Next image",
    vi: "Ảnh tiếp theo",
  },
  imageCounter: {
    en: "Image",
    vi: "Ảnh",
  },
  liveDemo: {
    en: "Live Demo",
    vi: "Bản demo",
  },
  code: {
    en: "Code",
    vi: "Mã nguồn",
  },
} as const;

export function getFeaturedProjects(locale: Locale): FeaturedProjectsView {
  const featured = (projects as ReadonlyArray<Project>)
    .filter((project) => project.featured)
    .sort((left, right) => left.order - right.order);

  return {
    eyebrow: projectCopy.eyebrow[locale],
    title: projectCopy.title[locale],
    description: projectCopy.description[locale],
    selectorLabel: projectCopy.selectorLabel[locale],
    previousImage: projectCopy.previousImage[locale],
    nextImage: projectCopy.nextImage[locale],
    imageCounter: projectCopy.imageCounter[locale],
    liveDemo: projectCopy.liveDemo[locale],
    code: projectCopy.code[locale],
    projects: featured.map((project, index) => ({
      id: project.id,
      index: String(index + 1).padStart(2, "0"),
      title: project.title[locale],
      category: project.category[locale],
      summary: project.summary[locale],
      techStack: project.techStack,
      media: project.media.map((media) => ({
        id: media.id,
        src: media.src,
        alt: media.alt[locale],
        width: media.width,
        height: media.height,
        focalPoint: media.focalPoint,
      })),
      liveDemoUrl: project.liveDemoUrl,
      codeUrl: project.codeUrl,
      highlights: project.highlights?.map((highlight) => highlight[locale]),
    })),
  };
}
