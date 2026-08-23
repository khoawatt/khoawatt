import type { Locale } from "@/features/i18n/config";

type LocalizedText = Readonly<Record<Locale, string>>;

export type SkillGroup = "tech-stack" | "others";

/** Runtime single source for valid icon keys (admin selectors, validation). */
export const skillIconKeys = [
  "typescript",
  "javascript",
  "react",
  "nextjs",
  "nodejs",
  "nestjs",
  "postgresql",
  "wordpress",
  "python",
  "mongodb",
  "mysql",
  "docker",
  "aws",
  "digitalocean",
  "firebase",
  "azuredevops",
  "tailwindcss",
  "scss",
  "linux",
] as const;

export type SkillIconKey = (typeof skillIconKeys)[number];

export interface SkillView {
  id: string;
  name: string;
  iconKey?: SkillIconKey;
}

export interface SkillSectionView {
  id: string;
  name: string;
  skills: ReadonlyArray<SkillView>;
}

export interface SkillCategoryView {
  id: string;
  name: string;
  subtitle?: string;
  featured?: boolean;
  skills: ReadonlyArray<SkillView>;
  sections?: ReadonlyArray<SkillSectionView>;
}

export interface SkillsContentView {
  eyebrow: string;
  title: string;
  description: string;
  tabsLabel: string;
  tabs: Readonly<Record<SkillGroup, string>>;
  panels: Readonly<Record<SkillGroup, string>>;
  techStack: ReadonlyArray<SkillView>;
  otherCategories: ReadonlyArray<SkillCategoryView>;
}

const skillCopy = {
  eyebrow: {
    en: "Capabilities",
    vi: "Năng lực",
  },
  title: {
    en: "Skills built for useful products.",
    vi: "Kỹ năng để xây dựng sản phẩm hữu ích.",
  },
  description: {
    en: "A practical toolkit for shaping dependable web experiences, from interface to infrastructure.",
    vi: "Bộ kỹ năng thực tiễn để tạo nên trải nghiệm web đáng tin cậy, từ giao diện đến hạ tầng.",
  },
  tabsLabel: {
    en: "Skill categories",
    vi: "Nhóm kỹ năng",
  },
  tabs: {
    "tech-stack": {
      en: "Tech Stack",
      vi: "Công nghệ",
    },
    others: {
      en: "Others",
      vi: "Kỹ năng khác",
    },
  },
  panels: {
    "tech-stack": {
      en: "Core technologies used to build and ship web products.",
      vi: "Các công nghệ cốt lõi dùng để xây dựng và đưa sản phẩm web vào vận hành.",
    },
    others: {
      en: "Complementary skills grouped by the work they support.",
      vi: "Các kỹ năng bổ trợ được nhóm theo công việc mà chúng hỗ trợ.",
    },
  },
} as const;

/** Stable taxonomy keys for Others-tab top-level groups. */
export const otherGroupKeys = [
  "architecture",
  "devops-infrastructure",
  "frontend-ux",
  "seo-growth",
  "workflow-collaboration",
  "product-creative",
  "agentic-ai-development",
] as const;

export type OtherGroupKey = (typeof otherGroupKeys)[number];

/** Stable taxonomy keys for sub-sections nested inside a group. */
export const otherSectionKeys = [
  "ai-models-assistants",
  "agentic-coding-harness",
  "ai-development-capabilities",
] as const;

export type OtherSectionKey = (typeof otherSectionKeys)[number];

export type OtherCategoryKey = OtherGroupKey | OtherSectionKey;

export const otherCategoryKeys: ReadonlyArray<OtherCategoryKey> = [
  ...otherGroupKeys,
  ...otherSectionKeys,
];

interface TechStackDefinition {
  readonly id: string;
  readonly name: string;
  readonly iconKey?: SkillIconKey;
  readonly featured?: boolean;
}

/**
 * Approved Tech Stack tab content (owner-approved list, 2026-08).
 * Names are proper nouns shared across locales; WSL intentionally has no
 * Simple Icons glyph and falls back to the generic `{}` mark.
 */
const techStackDefinitions: ReadonlyArray<TechStackDefinition> = [
  { id: "typescript", name: "TypeScript", iconKey: "typescript", featured: true },
  { id: "javascript", name: "JavaScript", iconKey: "javascript", featured: true },
  { id: "python", name: "Python", iconKey: "python" },
  { id: "nodejs", name: "Node.js", iconKey: "nodejs" },
  { id: "nestjs", name: "NestJS", iconKey: "nestjs" },
  { id: "react", name: "React", iconKey: "react", featured: true },
  { id: "nextjs", name: "Next.js", iconKey: "nextjs", featured: true },
  { id: "mongodb", name: "MongoDB", iconKey: "mongodb" },
  { id: "postgresql", name: "PostgreSQL", iconKey: "postgresql" },
  { id: "mysql", name: "MySQL", iconKey: "mysql" },
  { id: "docker", name: "Docker", iconKey: "docker" },
  { id: "aws", name: "AWS", iconKey: "aws" },
  { id: "digitalocean", name: "DigitalOcean", iconKey: "digitalocean" },
  { id: "firebase", name: "Firebase", iconKey: "firebase" },
  { id: "azuredevops", name: "Azure DevOps", iconKey: "azuredevops" },
  { id: "tailwindcss", name: "Tailwind CSS", iconKey: "tailwindcss" },
  { id: "scss", name: "SCSS", iconKey: "scss" },
  { id: "wordpress", name: "WordPress", iconKey: "wordpress" },
  { id: "wsl", name: "WSL" },
  { id: "linux", name: "Linux", iconKey: "linux" },
];

interface OtherSkillDefinition {
  readonly id: string;
  readonly name: LocalizedText;
}

interface OtherSectionDefinition {
  readonly id: OtherSectionKey;
  readonly name: LocalizedText;
  readonly skills: ReadonlyArray<OtherSkillDefinition>;
}

interface OtherGroupDefinition {
  readonly id: OtherGroupKey;
  readonly name: LocalizedText;
  readonly subtitle: LocalizedText;
  readonly featured?: boolean;
  readonly skills?: ReadonlyArray<OtherSkillDefinition>;
  readonly sections?: ReadonlyArray<OtherSectionDefinition>;
}

/** Owner-approved Others tab groups and subtitles (2026-08). */
export const otherGroupDefinitions: ReadonlyArray<OtherGroupDefinition> = [
  {
    id: "architecture",
    name: { en: "Architecture", vi: "Kiến trúc" },
    subtitle: {
      en: "Backend architecture & engineering practices.",
      vi: "Kiến trúc backend & thực hành kỹ thuật.",
    },
    skills: [
      { id: "rest-api", name: { en: "REST API", vi: "REST API" } },
      {
        id: "clean-architecture",
        name: { en: "Clean Architecture", vi: "Clean Architecture" },
      },
      {
        id: "dependency-injection",
        name: { en: "Dependency Injection", vi: "Dependency Injection" },
      },
      {
        id: "api-integration",
        name: { en: "API Integration", vi: "Tích hợp API" },
      },
    ],
  },
  {
    id: "devops-infrastructure",
    name: { en: "DevOps & Infrastructure", vi: "DevOps & Hạ tầng" },
    subtitle: {
      en: "Infrastructure, deployment and cloud technologies.",
      vi: "Hạ tầng, triển khai và công nghệ đám mây.",
    },
    skills: [
      { id: "aws-skill", name: { en: "AWS", vi: "AWS" } },
      {
        id: "digitalocean-skill",
        name: { en: "DigitalOcean", vi: "DigitalOcean" },
      },
      { id: "firebase-skill", name: { en: "Firebase", vi: "Firebase" } },
      {
        id: "azure-devops-skill",
        name: { en: "Azure DevOps", vi: "Azure DevOps" },
      },
      { id: "docker-skill", name: { en: "Docker", vi: "Docker" } },
      { id: "vps", name: { en: "VPS", vi: "VPS" } },
      { id: "linux-skill", name: { en: "Linux", vi: "Linux" } },
      { id: "wsl-skill", name: { en: "WSL", vi: "WSL" } },
    ],
  },
  {
    id: "frontend-ux",
    name: { en: "Frontend & UX", vi: "Frontend & UX" },
    subtitle: {
      en: "Building responsive, accessible and optimized web experiences.",
      vi: "Xây dựng trải nghiệm web responsive, dễ tiếp cận và tối ưu.",
    },
    skills: [
      {
        id: "responsive-design",
        name: { en: "Responsive Design", vi: "Thiết kế responsive" },
      },
      {
        id: "web-accessibility",
        name: { en: "Web Accessibility", vi: "Khả năng tiếp cận web" },
      },
      {
        id: "performance-optimization",
        name: { en: "Performance Optimization", vi: "Tối ưu hiệu năng" },
      },
      {
        id: "core-web-vitals",
        name: { en: "Core Web Vitals", vi: "Core Web Vitals" },
      },
      { id: "localization", name: { en: "Localization", vi: "Bản địa hóa" } },
    ],
  },
  {
    id: "seo-growth",
    name: { en: "SEO & Growth", vi: "SEO & Tăng trưởng" },
    subtitle: {
      en: "Improving website visibility, structure and growth.",
      vi: "Cải thiện khả năng hiển thị, cấu trúc và tăng trưởng của website.",
    },
    skills: [
      { id: "technical-seo", name: { en: "Technical SEO", vi: "SEO kỹ thuật" } },
      { id: "on-page-seo", name: { en: "On-page SEO", vi: "On-page SEO" } },
      { id: "off-page-seo", name: { en: "Off-page SEO", vi: "Off-page SEO" } },
      { id: "google-ads", name: { en: "Google Ads", vi: "Google Ads" } },
      { id: "wordpress-skill", name: { en: "WordPress", vi: "WordPress" } },
      {
        id: "website-architecture",
        name: { en: "Website Architecture", vi: "Kiến trúc website" },
      },
      {
        id: "keyword-research",
        name: { en: "Keyword Research", vi: "Nghiên cứu từ khóa" },
      },
    ],
  },
  {
    id: "workflow-collaboration",
    name: { en: "Workflow & Collaboration", vi: "Quy trình & Hợp tác" },
    subtitle: {
      en: "Working effectively across engineering teams and product workflows.",
      vi: "Làm việc hiệu quả cùng đội ngũ kỹ thuật và quy trình sản phẩm.",
    },
    skills: [
      { id: "git", name: { en: "Git", vi: "Git" } },
      { id: "github", name: { en: "GitHub", vi: "GitHub" } },
      { id: "gitlab", name: { en: "GitLab", vi: "GitLab" } },
      { id: "jira", name: { en: "JIRA", vi: "JIRA" } },
      { id: "agile-scrum", name: { en: "Agile / Scrum", vi: "Agile / Scrum" } },
      { id: "code-review", name: { en: "Code Review", vi: "Code Review" } },
      {
        id: "pair-programming",
        name: { en: "Pair Programming", vi: "Pair Programming" },
      },
      {
        id: "cross-functional-collaboration",
        name: {
          en: "Cross-functional Collaboration",
          vi: "Hợp tác liên bộ phận",
        },
      },
      {
        id: "requirement-analysis",
        name: { en: "Requirement Analysis", vi: "Phân tích yêu cầu" },
      },
      {
        id: "technical-planning",
        name: { en: "Technical Planning", vi: "Lập kế hoạch kỹ thuật" },
      },
    ],
  },
  {
    id: "product-creative",
    name: { en: "Product & Creative", vi: "Sản phẩm & Sáng tạo" },
    subtitle: {
      en: "Product creation, visual content and digital promotion.",
      vi: "Tạo dựng sản phẩm, nội dung thị giác và quảng bá số.",
    },
    skills: [
      { id: "canva", name: { en: "Canva", vi: "Canva" } },
      {
        id: "adobe-photoshop",
        name: { en: "Adobe Photoshop", vi: "Adobe Photoshop" },
      },
      { id: "capcut", name: { en: "CapCut", vi: "CapCut" } },
      {
        id: "content-creation",
        name: { en: "Content Creation", vi: "Sáng tạo nội dung" },
      },
      {
        id: "visual-design",
        name: { en: "Visual Design", vi: "Thiết kế thị giác" },
      },
      {
        id: "product-presentation",
        name: { en: "Product Presentation", vi: "Trình bày sản phẩm" },
      },
      {
        id: "digital-content",
        name: { en: "Digital Content", vi: "Nội dung số" },
      },
    ],
  },
  {
    id: "agentic-ai-development",
    name: {
      en: "Agentic AI & AI Development",
      vi: "Agentic AI & Phát triển AI",
    },
    subtitle: {
      en: "AI-assisted engineering, coding agents and autonomous development workflows.",
      vi: "Kỹ thuật hỗ trợ bởi AI, coding agent và quy trình phát triển tự chủ.",
    },
    featured: true,
    sections: [
      {
        id: "ai-models-assistants",
        name: { en: "AI Models & Assistants", vi: "Mô hình & Trợ lý AI" },
        skills: [
          { id: "chatgpt", name: { en: "ChatGPT", vi: "ChatGPT" } },
          { id: "claude", name: { en: "Claude", vi: "Claude" } },
          {
            id: "google-gemini",
            name: { en: "Google Gemini", vi: "Google Gemini" },
          },
          { id: "deepseek", name: { en: "DeepSeek", vi: "DeepSeek" } },
        ],
      },
      {
        id: "agentic-coding-harness",
        name: {
          en: "Agentic Coding & Harness",
          vi: "Agentic Coding & Harness",
        },
        skills: [
          { id: "opencode", name: { en: "OpenCode", vi: "OpenCode" } },
          {
            id: "codex-desktop-cli",
            name: { en: "Codex Desktop / CLI", vi: "Codex Desktop / CLI" },
          },
          { id: "claude-cli", name: { en: "Claude CLI", vi: "Claude CLI" } },
          { id: "antigravity", name: { en: "Antigravity", vi: "Antigravity" } },
          {
            id: "commandcode",
            name: { en: "CommandCode", vi: "CommandCode" },
          },
          { id: "openclaw", name: { en: "OpenClaw", vi: "OpenClaw" } },
        ],
      },
      {
        id: "ai-development-capabilities",
        name: {
          en: "AI Development Capabilities",
          vi: "Năng lực phát triển AI",
        },
        skills: [
          { id: "agentic-coding", name: { en: "Agentic Coding", vi: "Agentic Coding" } },
          {
            id: "multi-agent-workflows",
            name: { en: "Multi-agent Workflows", vi: "Quy trình đa agent" },
          },
          {
            id: "ai-assisted-development",
            name: {
              en: "AI-assisted Development",
              vi: "Phát triển hỗ trợ bởi AI",
            },
          },
          {
            id: "context-engineering",
            name: { en: "Context Engineering", vi: "Context Engineering" },
          },
          {
            id: "tool-mcp-integration",
            name: {
              en: "Tool / MCP Integration",
              vi: "Tích hợp Tool / MCP",
            },
          },
          {
            id: "ai-workflow-orchestration",
            name: {
              en: "AI Workflow Orchestration",
              vi: "Điều phối quy trình AI",
            },
          },
          {
            id: "repository-aware-development",
            name: {
              en: "Repository-aware Development",
              vi: "Phát triển gắn với repository",
            },
          },
        ],
      },
    ],
  },
];

/** Stable taxonomy keys for Others-tab groups and their sub-sections. */
export interface OtherTaxonomyNode {
  readonly key: OtherCategoryKey;
  readonly kind: "group" | "section";
  /** Present when kind === "section". */
  readonly parentKey?: OtherGroupKey;
  readonly label: LocalizedText;
}

/**
 * Single source of truth for Others-tab taxonomy membership: stable keys plus
 * localized labels, derived from the owner-approved group definitions so the
 * public render and admin selectors can never drift apart.
 */
export const otherTaxonomy: ReadonlyArray<OtherTaxonomyNode> =
  otherGroupDefinitions.flatMap((group) => [
    {
      key: group.id,
      kind: "group" as const,
      label: group.name,
    },
    ...(group.sections?.map(
      (section): OtherTaxonomyNode => ({
        key: section.id,
        kind: "section" as const,
        parentKey: group.id,
        label: section.name,
      }),
    ) ?? []),
  ]);

export function isOtherCategoryKey(
  value: string | null | undefined,
): value is OtherCategoryKey {
  return (
    typeof value === "string" &&
    (otherCategoryKeys as ReadonlyArray<string>).includes(value)
  );
}

export interface OtherCategoryEntry {
  id: string;
  name: string;
  /** Stable taxonomy key (see otherTaxonomy); takes precedence over categoryEn. */
  categoryKey?: string;
  /** Legacy assignment: exact English group/section title. Kept as a
   * compatibility path for rows not yet backfilled to category_key. */
  categoryEn: string | null;
  /** Locale-aware category label used when a category is unknown to code. */
  categoryDisplay?: string;
  iconKey?: SkillIconKey;
}

/**
 * Folds flat skill entries (static or CMS) into ordered skill-group cards.
 * Entries are matched to a group (or one of its sections) by their English
 * category title; unknown categories become plain trailing cards so
 * owner-added CMS categories still render.
 */
export function foldOtherCategories(
  entries: ReadonlyArray<OtherCategoryEntry>,
  locale: Locale,
): Array<SkillCategoryView> {
  const localizedGroups = otherGroupDefinitions.map((group) => ({
    definition: group,
    card: {
      id: group.id,
      name: group.name[locale],
      subtitle: group.subtitle[locale],
      featured: group.featured,
      skills: [] as SkillView[],
      sections: group.sections?.map((section) => ({
        id: section.id,
        name: section.name[locale],
        skills: [] as SkillView[],
      })),
    } satisfies SkillCategoryView,
  }));

  const knownTitles = new Map<string, number>();
  const sectionIndexByTitle = new Map<string, { group: number; index: number }>();
  const groupIndexByKey = new Map<string, number>();
  const sectionIndexByKey = new Map<string, { group: number; index: number }>();

  localizedGroups.forEach((group, index) => {
    knownTitles.set(group.definition.name.en, index);
    groupIndexByKey.set(group.definition.id, index);

    group.definition.sections?.forEach((section, sectionIdx) => {
      sectionIndexByTitle.set(section.name.en, { group: index, index: sectionIdx });
      sectionIndexByKey.set(section.id, { group: index, index: sectionIdx });
    });
  });

  for (const entry of entries) {
    if (entry.categoryKey || entry.categoryEn) {
      const sectionTarget = entry.categoryKey
        ? sectionIndexByKey.get(entry.categoryKey)
        : sectionIndexByTitle.get(entry.categoryEn ?? "");

      if (sectionTarget) {
        const target = localizedGroups[sectionTarget.group];

        target.card.sections?.[sectionTarget.index]?.skills.push({
          id: entry.id,
          name: entry.name,
          iconKey: entry.iconKey,
        });
        continue;
      }

      const groupIndex = entry.categoryKey
        ? groupIndexByKey.get(entry.categoryKey)
        : knownTitles.get(entry.categoryEn ?? "");

      if (groupIndex !== undefined) {
        localizedGroups[groupIndex].card.skills.push({
          id: entry.id,
          name: entry.name,
          iconKey: entry.iconKey,
        });
        continue;
      }
    }
  }

  const cards = localizedGroups
    .filter((group) => {
      const hasSkills =
        group.card.skills.length > 0 ||
        (group.card.sections?.some((section) => section.skills.length > 0) ??
          false);

      return hasSkills;
    })
    .map((group) => group.card);

  const knownCardIds = new Set<string>(cards.map((card) => card.id));

  const fallbackCards = buildFallbackCards(entries).filter(
    (card) => !knownCardIds.has(card.id),
  );

  return [...cards, ...fallbackCards];
}

function buildFallbackCards(
  entries: ReadonlyArray<OtherCategoryEntry>,
): Array<SkillCategoryView> {
  const fallback = new Map<string, SkillCategoryView>();

  for (const entry of entries) {
    const assignment = entry.categoryKey ?? entry.categoryEn;

    if (!assignment || isKnownAssignment(assignment)) {
      continue;
    }

    const existing = fallback.get(assignment);
    const skill: SkillView = {
      id: entry.id,
      name: entry.name,
      iconKey: entry.iconKey,
    };

    if (existing) {
      existing.skills = [...existing.skills, skill];
    } else {
      fallback.set(assignment, {
        id: assignment.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
        name:
          entry.categoryDisplay ??
          entry.categoryEn ??
          assignment,
        skills: [skill],
      });
    }
  }

  return [...fallback.values()];
}

function isKnownAssignment(assignment: string): boolean {
  return (
    isOtherCategoryKey(assignment) ||
    otherGroupDefinitions.some(
      (group) =>
        group.name.en === assignment ||
        (group.sections?.some((section) => section.name.en === assignment) ??
          false),
    )
  );
}

function localizeTechStack(): ReadonlyArray<SkillView> {
  return techStackDefinitions.map((definition) => ({
    id: definition.id,
    name: definition.name,
    iconKey: definition.iconKey,
  }));
}

export function getSkillsContent(locale: Locale): SkillsContentView {
  const techStack = localizeTechStack();

  const staticEntries: ReadonlyArray<OtherCategoryEntry> =
    otherGroupDefinitions.flatMap((group) => {
      const flatSkills = (group.skills ?? []).map((skill) => ({
        id: skill.id,
        name: skill.name[locale],
        categoryKey: group.id,
        categoryEn: group.name.en,
        categoryDisplay: group.name[locale],
      }));

      const sectionSkills = (group.sections ?? []).flatMap((section) =>
        section.skills.map((skill) => ({
          id: skill.id,
          name: skill.name[locale],
          categoryKey: section.id,
          categoryEn: section.name.en,
          categoryDisplay: section.name[locale],
        })),
      );

      return [...flatSkills, ...sectionSkills];
    });

  return {
    eyebrow: skillCopy.eyebrow[locale],
    title: skillCopy.title[locale],
    description: skillCopy.description[locale],
    tabsLabel: skillCopy.tabsLabel[locale],
    tabs: {
      "tech-stack": skillCopy.tabs["tech-stack"][locale],
      others: skillCopy.tabs.others[locale],
    },
    panels: {
      "tech-stack": skillCopy.panels["tech-stack"][locale],
      others: skillCopy.panels.others[locale],
    },
    techStack,
    otherCategories: foldOtherCategories(staticEntries, locale),
  };
}
