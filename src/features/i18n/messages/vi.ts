import type { PortfolioMessages } from "@/features/i18n/messages/types";

const messages = {
  metadata: {
    title: "Quách Võ Anh Khoa",
    description: "Nền tảng portfolio của Quách Võ Anh Khoa.",
  },
  localeSwitcher: {
    label: "Đổi ngôn ngữ",
    currentLanguage: "Ngôn ngữ hiện tại",
    english: "English",
    vietnamese: "Tiếng Việt",
  },
  header: {
    primaryNavigation: "Các phần portfolio",
    homeAction: "Đi đến Trang chủ",
    openMenu: "Mở trình đơn điều hướng",
    closeMenu: "Đóng trình đơn điều hướng",
    github: "Mở hồ sơ GitHub",
    sections: {
      home: "Trang chủ",
      about: "Giới thiệu",
      skills: "Kỹ năng",
      projects: "Dự án",
      resume: "Hồ sơ",
      blog: "Bài viết",
      contact: "Liên hệ",
    },
  },
  blog: {
    eyebrow: "Bài viết",
    title: "Ghi chú, bài viết chuyên sâu và đánh giá.",
    intro:
      "Viết về web, kỹ thuật và những công cụ đang định hình cách tôi xây dựng.",
    emptyState: "Chưa có bài viết nào — bài đầu tiên đang được chuẩn bị.",
    readMinutes: "{count} phút đọc",
    publishedLabel: "Đăng ngày",
    updatedLabel: "Cập nhật",
    categoryLabel: "Chuyên mục",
    tagsLabel: "Thẻ",
    onThisPage: "Trong bài viết này",
    relatedPosts: "Bài viết liên quan",
    breadcrumbLabel: "Đường dẫn",
    backToBlog: "Tất cả bài viết",
    homeLabel: "Trang chủ",
    paginationLabel: "Phân trang",
    paginationPrev: "Trang trước",
    paginationNext: "Trang sau",
    pageNumberLabel: "Trang {n}",
    topicsLabel: "Thư viện kiến thức",
    topicsViewAll: "Tất cả chủ đề",
    categoryPostCount: "{count} bài viết",
    readMoreLabel: "Đọc bài viết",
    backToTopLabel: "Lên đầu trang",
  },
  themeToggle: {
    toggle: "Chuyển giao diện màu",
    switchToLight: "Chuyển sang giao diện sáng",
    switchToDark: "Chuyển sang giao diện tối",
  },
  notFound: {
    eyebrow: "404",
    title: "Không tìm thấy trang này",
    description: "Trang bạn đang tìm có thể đã di chuyển hoặc không còn tồn tại.",
    homeAction: "Về Trang chủ",
  },
  foundation: {
    eyebrow: "Nền tảng portfolio",
    title: "Một khung nền rõ ràng cho hành trình phía trước.",
    description:
      "Hệ thống thiết kế và khung trang dùng chung đã sẵn sàng cho các phần nội dung portfolio.",
    items: [
      {
        id: "responsive",
        title: "Responsive ngay từ đầu",
        description:
          "Container dùng chung thích ứng từ thiết bị di động đến màn hình rộng.",
      },
      {
        id: "visual-language",
        title: "Một ngôn ngữ thiết kế",
        description:
          "Token ngữ nghĩa giúp các phần sau này đồng nhất và dễ bảo trì.",
      },
      {
        id: "motion",
        title: "Chuyển động có chủ đích",
        description:
          "Nền tảng tôn trọng tùy chọn giảm chuyển động ngay từ đầu.",
      },
    ],
  },
} satisfies PortfolioMessages;

export default messages;
