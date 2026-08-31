import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Locale } from "@/features/i18n/config";
import { contactDetails } from "@/content/contact";
import { portfolioProfile } from "@/content/profile";
import { projects, type Project } from "@/content/projects";
import {
  getResumeLockContent,
  resumeEntries,
  type ResumeEntry,
} from "@/content/resume";

const locales: Locale[] = ["en", "vi"];

const publicRoot = join(process.cwd(), "public");

const allProjects = projects as ReadonlyArray<Project>;
const allEntries = resumeEntries as ReadonlyArray<ResumeEntry>;

const employerNames = [
  "Dynamic Global Solutions",
  "EnglishWing",
  "SmartIT",
  "Zenitech",
];

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, out);
    }
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, out);
    }
  }
  return out;
}

test("every project is complete for both locales", () => {
  for (const project of allProjects) {
    for (const locale of locales) {
      assert.ok(
        project.title[locale].length > 0,
        `project ${project.id} missing en/vi title`,
      );
      assert.ok(
        project.summary[locale].length > 0,
        `project ${project.id} missing en/vi summary`,
      );
      for (const media of project.media) {
        assert.ok(media.alt[locale].length > 0, `project ${project.id} media alt`);
      }
    }
  }
});

test("every resume entry is complete for both locales", () => {
  for (const entry of allEntries) {
    for (const locale of locales) {
      assert.ok(entry.title[locale].length > 0, `entry ${entry.id} title`);
      for (const media of entry.media ?? []) {
        assert.ok(media.alt[locale].length > 0, `entry ${entry.id} media alt`);
        assert.ok(media.width && media.width > 0, `entry ${entry.id} media width`);
        assert.ok(media.height && media.height > 0, `entry ${entry.id} media height`);
      }
    }
  }
});

test("career entries publish the four approved employer names (D3 reversal)", () => {
  const careerEntries = allEntries.filter(
    (entry) => entry.category === "career-journey",
  );
  const publishedOrganizations = careerEntries
    .map((entry) => entry.organization)
    .filter(
      (
        organization,
      ): organization is NonNullable<ResumeEntry["organization"]> =>
        Boolean(organization),
    )
    .map((organization) => organization.en);

  for (const name of employerNames) {
    assert.ok(
      publishedOrganizations.includes(name),
      `career entry missing employer name: ${name}`,
    );
  }
  assert.equal(publishedOrganizations.length, careerEntries.length);
});

test("private resume never exposes sensitive strings to the client", () => {
  const sensitiveStrings = [
    ...employerNames,
    "GPA",
    "7.72",
    "codeforces.com",
    "/api/resume-media/",
    "Transcript",
    "englishwing-employment",
  ];
  for (const locale of locales) {
    const lockContent = getResumeLockContent(locale);
    const serialized = JSON.stringify(lockContent);
    for (const needle of sensitiveStrings) {
      assert.ok(
        !serialized.includes(needle),
        `private lock content leaked sensitive string for ${locale}: ${needle}`,
      );
    }
    assert.ok(
      !("categories" in lockContent),
      `private lock content must not carry resume entries (${locale})`,
    );
  }
});

test("resume media is gated behind /api/resume-media/ (not public static)", () => {
  const referenced = allEntries.flatMap((entry) =>
    (entry.media ?? []).flatMap((media) => [
      media.thumbnailSrc,
      media.fullSrc,
    ]),
  );
  assert.ok(referenced.length > 0, "expected resume media references");
  for (const source of referenced) {
    assert.ok(
      source.startsWith("/api/resume-media/"),
      `resume media must be gated, not served from public/: ${source}`,
    );
    const filename = source.replace("/api/resume-media/", "");
    assert.ok(
      approvedCertificateDerivatives.has(filename),
      `unapproved certificate derivative referenced: ${source}`,
    );
  }
  assert.equal(
    new Set(referenced).size,
    approvedCertificateDerivatives.size,
    "every approved derivative must be referenced exactly once",
  );
});

test("legacy project slug is preserved for redirect compatibility", () => {
  const landing = allProjects.find(
    (project) => project.id === "dynamic-global-solution-landing-page",
  );

  assert.ok(landing, "landing page project still present (D2 temporary dataset)");
  assert.equal(landing.slug, "dynamic-global-solution-landing-page");
});

test("no fake or placeholder external links", () => {
  const links = collectStrings([
    portfolioProfile.githubUrl,
    allProjects
      .flatMap((project) => [project.liveDemoUrl, project.codeUrl])
      .filter(Boolean),
    allEntries.flatMap((entry) => (entry.links ?? []).map((link) => link.href)),
    contactDetails,
  ]).filter((value) => value.startsWith("http") || value.startsWith("/"));

  for (const link of links) {
    assert.ok(
      !link.includes("#"),
      `placeholder/fake link detected: ${link}`,
    );
  }
});

test("no resumeUrl is wired until a real CV exists (D5)", () => {
  assert.equal(
    "resumeUrl" in portfolioProfile ? portfolioProfile.resumeUrl : undefined,
    undefined,
    "resumeUrl must be omitted until the owner supplies a real CV file and stable URL",
  );
});

test("contact details carry owner-approved destinations (supersedes D8)", () => {
  const detailIds = Object.keys(contactDetails).sort();
  assert.deepEqual(detailIds, ["email", "location", "phone"]);
  assert.equal(contactDetails.email.href, "mailto:contact@khoawatt.com");
  assert.equal(contactDetails.phone.href, "tel:+84704823238");
  assert.equal(
    "href" in contactDetails.location,
    false,
    "location is intentionally not a link",
  );
});

test("referenced public images exist on disk", () => {
  const resumeMedia = allEntries.flatMap((entry) =>
    (entry.media ?? []).flatMap((media) => [
      media.thumbnailSrc,
      media.fullSrc,
    ]),
  );
  const publicMedia = [
    portfolioProfile.media.hero.src,
    ...portfolioProfile.media.aboutPortraits.map((portrait) => portrait.src),
    ...allProjects.flatMap((project) => project.media.map((media) => media.src)),
  ];

  for (const source of publicMedia) {
    assert.ok(
      existsSync(join(publicRoot, source.replace(/^\//, ""))),
      `missing public asset: ${source}`,
    );
  }
  for (const source of resumeMedia) {
    assert.ok(
      source.startsWith("/api/resume-media/"),
      `resume media must be gated behind /api/resume-media/: ${source}`,
    );
    const filename = source.replace("/api/resume-media/", "");
    assert.ok(
      existsSync(
        join(process.cwd(), "private-assets", "resume", filename),
      ),
      `missing gated resume asset: ${source}`,
    );
  }
});

test("all featured projects carry a real destination or none is faked", () => {
  for (const project of allProjects.filter((project) => project.featured)) {
    for (const url of [project.liveDemoUrl, project.codeUrl]) {
      assert.ok(
        url === undefined || url.startsWith("https://"),
        `project ${project.id} has a non-https link: ${url}`,
      );
    }
  }
});

const verifiedExternalUrls = new Set([
  "https://www.youtube.com/watch?v=f3NrpMbqwV4",
  "https://youtu.be/4O9kGRFmXVY",
  "https://www.youtube.com/watch?v=BU1RvITWoi8",
  "https://youtu.be/WD_NulE5_l4",
  "https://github.com/Akbi47/Feaon-ldp-v2",
  "https://codeforces.com/profile/anhkhoaquachvo",
]);

test("every external URL is owner-verified and live (D2, 2026-08-18)", () => {
  const used = new Set<string>();
  for (const project of allProjects) {
    for (const url of [project.liveDemoUrl, project.codeUrl]) {
      if (url) {
        used.add(url);
        assert.ok(
          verifiedExternalUrls.has(url),
          `project ${project.id} uses an unverified external URL: ${url}`,
        );
      }
    }
  }
  for (const entry of allEntries) {
    for (const link of entry.links ?? []) {
      used.add(link.href);
      assert.ok(
        verifiedExternalUrls.has(link.href),
        `resume entry ${entry.id} uses an unverified external URL: ${link.href}`,
      );
    }
  }
  assert.ok(used.size > 0, "expected at least one verified external URL");
});

const approvedCertificateDerivatives = new Set([
  "bachelor-degree.jpg",
  "bachelor-degree-thumb.jpg",
  "toeic.jpg",
  "toeic-thumb.jpg",
  "basic-it-application.jpg",
  "basic-it-application-thumb.jpg",
  "transcript.jpg",
  "transcript-thumb.jpg",
  "englishwing-employment.jpg",
  "englishwing-employment-thumb.jpg",
  "codeforces.jpg",
  "codeforces-thumb.jpg",
]);

test("resume certificate media uses only the approved derivatives, gated (D4)", () => {
  const referenced = allEntries.flatMap((entry) =>
    (entry.media ?? []).flatMap((media) => [
      media.thumbnailSrc,
      media.fullSrc,
    ]),
  );
  for (const source of referenced) {
    assert.ok(
      source.startsWith("/api/resume-media/"),
      `resume media must be gated behind /api/resume-media/: ${source}`,
    );
    const filename = source.replace("/api/resume-media/", "");
    assert.ok(
      approvedCertificateDerivatives.has(filename),
      `unapproved certificate derivative referenced: ${source}`,
    );
  }
  assert.equal(new Set(referenced).size, approvedCertificateDerivatives.size);
});

test("no raw legacy-assets files are referenced in published media (D4)", () => {
  const publishedSources = [
    portfolioProfile.media.hero.src,
    ...portfolioProfile.media.aboutPortraits.map((portrait) => portrait.src),
    ...allProjects.flatMap((project) => project.media.map((media) => media.src)),
    ...allEntries.flatMap((entry) =>
      (entry.media ?? []).flatMap((media) => [
        media.thumbnailSrc,
        media.fullSrc,
      ]),
    ),
  ];
  const rawLegacyFiles = [
    "quachvoanhkhoa-certificate-1.jpg",
    "quachvoanhkhoa-certificate-2.jpg",
    "quachvoanhkhoa-certificate-3.jpg",
    "quachvoanhkhoa-certificate-4.jpg",
    "toeic-cer.jpg",
    "codeforces-cer.jpg",
    "QVAK-e1738690597153.png",
  ];
  for (const source of publishedSources) {
    assert.ok(
      !rawLegacyFiles.some((raw) => source.endsWith(raw)),
      `raw legacy asset leaked into public media: ${source}`,
    );
  }
});