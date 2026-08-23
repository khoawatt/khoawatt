import assert from "node:assert/strict";
import { test } from "node:test";

import { skillIcons } from "@/components/sections/skills/skill-icons";
import type { Locale } from "@/features/i18n/config";

import {
  foldOtherCategories,
  getSkillsContent,
  otherCategoryKeys,
  otherGroupDefinitions,
  otherTaxonomy,
} from "./skills";

const locales: Locale[] = ["en", "vi"];

const approvedTechStack = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Node.js",
  "NestJS",
  "React",
  "Next.js",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Docker",
  "AWS",
  "DigitalOcean",
  "Firebase",
  "Azure DevOps",
  "Tailwind CSS",
  "SCSS",
  "WordPress",
  "WSL",
  "Linux",
];

const approvedGroups = [
  {
    name: "Architecture",
    subtitle: "Backend architecture & engineering practices.",
    skills: [
      "REST API",
      "Clean Architecture",
      "Dependency Injection",
      "API Integration",
    ],
  },
  {
    name: "DevOps & Infrastructure",
    subtitle: "Infrastructure, deployment and cloud technologies.",
    skills: [
      "AWS",
      "DigitalOcean",
      "Firebase",
      "Azure DevOps",
      "Docker",
      "VPS",
      "Linux",
      "WSL",
    ],
  },
  {
    name: "Frontend & UX",
    subtitle:
      "Building responsive, accessible and optimized web experiences.",
    skills: [
      "Responsive Design",
      "Web Accessibility",
      "Performance Optimization",
      "Core Web Vitals",
      "Localization",
    ],
  },
  {
    name: "SEO & Growth",
    subtitle: "Improving website visibility, structure and growth.",
    skills: [
      "Technical SEO",
      "On-page SEO",
      "Off-page SEO",
      "Google Ads",
      "WordPress",
      "Website Architecture",
      "Keyword Research",
    ],
  },
  {
    name: "Workflow & Collaboration",
    subtitle:
      "Working effectively across engineering teams and product workflows.",
    skills: [
      "Git",
      "GitHub",
      "GitLab",
      "JIRA",
      "Agile / Scrum",
      "Code Review",
      "Pair Programming",
      "Cross-functional Collaboration",
      "Requirement Analysis",
      "Technical Planning",
    ],
  },
  {
    name: "Product & Creative",
    subtitle: "Product creation, visual content and digital promotion.",
    skills: [
      "Canva",
      "Adobe Photoshop",
      "CapCut",
      "Content Creation",
      "Visual Design",
      "Product Presentation",
      "Digital Content",
    ],
  },
];

const approvedAgenticSections = [
  {
    name: "AI Models & Assistants",
    skills: ["ChatGPT", "Claude", "Google Gemini", "DeepSeek"],
  },
  {
    name: "Agentic Coding & Harness",
    skills: [
      "OpenCode",
      "Codex Desktop / CLI",
      "Claude CLI",
      "Antigravity",
      "CommandCode",
      "OpenClaw",
    ],
  },
  {
    name: "AI Development Capabilities",
    skills: [
      "Agentic Coding",
      "Multi-agent Workflows",
      "AI-assisted Development",
      "Context Engineering",
      "Tool / MCP Integration",
      "AI Workflow Orchestration",
      "Repository-aware Development",
    ],
  },
];

test("tech stack lists exactly the 20 approved skills in order", () => {
  for (const locale of locales) {
    const content = getSkillsContent(locale);
    assert.equal(content.techStack.length, 20);
    if (locale === "en") {
      assert.deepEqual(
        content.techStack.map((skill) => skill.name),
        approvedTechStack,
      );
    }
  }
});

test("every tech-stack icon key resolves to a real glyph", () => {
  const content = getSkillsContent("en");
  for (const skill of content.techStack) {
    if (!skill.iconKey) {
      continue;
    }
    const icon = skillIcons[skill.iconKey];
    assert.ok(icon, `no glyph registered for ${skill.id}`);
    assert.ok(icon.path.length > 50, `glyph too short for ${skill.id}`);
  }
});

test("others tab contains exactly the 7 approved groups in order", () => {
  const content = getSkillsContent("en");
  assert.equal(content.otherCategories.length, 7);
  assert.deepEqual(
    content.otherCategories.map((category) => category.name),
    [...approvedGroups.map((group) => group.name), "Agentic AI & AI Development"],
  );
});

test("each flat group carries its subtitle and exact approved skills", () => {
  for (const locale of locales) {
    const content = getSkillsContent(locale);
    approvedGroups.forEach((group, index) => {
      const category = content.otherCategories[index];
      assert.equal(category.name, locale === "en" ? group.name : category.name);
      assert.ok(category.subtitle, `${group.name} missing subtitle (${locale})`);
      if (locale === "en") {
        assert.equal(category.subtitle, group.subtitle);
        assert.deepEqual(
          category.skills.map((skill) => skill.name),
          group.skills,
        );
      }
      assert.equal(category.sections, undefined, `${group.name} must be flat`);
    });
  }
});

test("agentic AI group is featured with three sub-sections and exact skills", () => {
  for (const locale of locales) {
    const content = getSkillsContent(locale);
    const agentic = content.otherCategories[6];
    assert.equal(agentic.featured, true);
    assert.equal(
      agentic.subtitle,
      locale === "en"
        ? "AI-assisted engineering, coding agents and autonomous development workflows."
        : agentic.subtitle,
    );
    assert.equal(agentic.skills.length, 0, "agentic skills live in sections");
    assert.deepEqual(
      agentic.sections?.map((section) => section.name),
      locale === "en"
        ? approvedAgenticSections.map((section) => section.name)
        : agentic.sections?.map((section) => section.name),
    );
    if (locale === "en") {
      agentic.sections?.forEach((section, index) => {
        assert.deepEqual(
          section.skills.map((skill) => skill.name),
          approvedAgenticSections[index].skills,
        );
      });
    }
  }
});

test("fold matches by stable category_key first", () => {
  const entries = [
    {
      id: "k8s",
      name: "Kubernetes",
      categoryKey: "devops-infrastructure",
      categoryEn: null,
    },
    {
      id: "n8n",
      name: "n8n",
      categoryKey: "agentic-coding-harness",
      categoryEn: null,
    },
  ];

  for (const locale of locales) {
    const cards = foldOtherCategories(entries, locale);
    const devops = cards.find((card) => card.id === "devops-infrastructure");
    assert.ok(devops, "key-only entry lands in its group");
    assert.ok(devops.skills.some((skill) => skill.id === "k8s"));

    const agentic = cards.find((card) => card.id === "agentic-ai-development");
    assert.ok(agentic, "agentic group renders when only sections match");
    const harness = agentic.sections?.find(
      (section) => section.id === "agentic-coding-harness",
    );
    assert.ok(harness);
    assert.ok(harness.skills.some((skill) => skill.id === "n8n"));
  }
});

test("fold keeps legacy English-title matching as a compatibility path", () => {
  const entries = [
    { id: "rest-api", name: "REST API", categoryEn: "Architecture" },
    {
      id: "chatgpt",
      name: "ChatGPT",
      categoryEn: "AI Models & Assistants",
    },
  ];

  for (const locale of locales) {
    const cards = foldOtherCategories(entries, locale);
    const architecture = cards.find((card) => card.id === "architecture");
    assert.ok(architecture?.skills.some((skill) => skill.id === "rest-api"));
    const agentic = cards.find((card) => card.id === "agentic-ai-development");
    const models = agentic?.sections?.find(
      (section) => section.id === "ai-models-assistants",
    );
    assert.ok(models?.skills.some((skill) => skill.id === "chatgpt"));
  }
});

test("unknown categories become distinct fallback cards; missing assignment is skipped", () => {
  const entries = [
    {
      id: "mystery",
      name: "Mystery Skill",
      categoryKey: "not-a-real-key",
      categoryEn: null,
      categoryDisplay: "Mystery",
    },
    {
      id: "legacy-typo",
      name: "Legacy Typo",
      categoryEn: "Architecure typo",
    },
    { id: "orphan", name: "Orphan", categoryEn: null },
  ];

  for (const locale of locales) {
    const cards = foldOtherCategories(entries, locale);
    const knownIds = new Set([
      "architecture",
      "devops-infrastructure",
      "frontend-ux",
      "seo-growth",
      "workflow-collaboration",
      "product-creative",
      "agentic-ai-development",
    ]);
    for (const card of cards) {
      if (knownIds.has(card.id)) continue;
      assert.ok(
        card.skills.some((skill) =>
          ["mystery", "legacy-typo"].includes(skill.id),
        ),
        `unexpected card ${card.id}`,
      );
    }
    const orphanStillRenders = cards.some((card) =>
      card.skills.some((skill) => skill.id === "orphan"),
    );
    assert.equal(orphanStillRenders, false);
  }
});

test("taxonomy keys stay in lockstep with group definitions", () => {
  const definitionIds = new Set<string>();

  for (const group of otherGroupDefinitions) {
    definitionIds.add(group.id);
    for (const section of group.sections ?? []) {
      definitionIds.add(section.id);
    }
  }

  assert.deepEqual(
    [...definitionIds].sort(),
    [...otherCategoryKeys].sort(),
    "otherCategoryKeys and definitions must not drift",
  );

  const keys = new Set<string>();
  for (const node of otherTaxonomy) {
    assert.equal(keys.has(node.key), false, `duplicate key ${node.key}`);
    keys.add(node.key);
    if (node.kind === "section") {
      assert.ok(node.parentKey, "sections must declare a parent group");
    }
  }
});
