import assert from "node:assert/strict";
import { test } from "node:test";

import type { OtherCategoryKey } from "@/content/skills";

import {
  bucketIdForCategoryKey,
  bucketizeSkills,
  UNASSIGNED_BUCKET_ID,
  type AdminSkillRow,
} from "./skill-buckets";

function row(overrides: Partial<AdminSkillRow>): AdminSkillRow {
  return {
    id: "skill-1",
    group: "others",
    categoryKey: null,
    iconKey: null,
    url: null,
    order: 0,
    featured: false,
    nameEn: "Skill",
    nameVi: "Skill",
    ...overrides,
  };
}

test("bucketIdForCategoryKey rolls section keys up to their parent group", () => {
  assert.equal(bucketIdForCategoryKey("architecture"), "architecture");
  assert.equal(
    bucketIdForCategoryKey("ai-models-assistants"),
    "agentic-ai-development",
  );
  assert.equal(
    bucketIdForCategoryKey("agentic-coding-harness"),
    "agentic-ai-development",
  );
  assert.equal(
    bucketIdForCategoryKey("ai-development-capabilities"),
    "agentic-ai-development",
  );
});

interface BucketExpectation {
  label: string;
  rows: AdminSkillRow[];
  want: Array<{ id: string; count: number }>;
}

const table: BucketExpectation[] = [
  {
    label: "places tech-stack skills in the Tech Stack bucket",
    rows: [
      row({ id: "ts", group: "tech-stack" }),
      row({ id: "ts2", group: "tech-stack" }),
    ],
    want: [{ id: "tech-stack", count: 2 }],
  },
  {
    label: "buckets others skills by their group key",
    rows: [row({ id: "arch", categoryKey: "architecture" })],
    want: [
      { id: "tech-stack", count: 0 },
      { id: "architecture", count: 1 },
    ],
  },
  {
    label: "rolls section-keyed skills into their parent Agentic AI bucket",
    rows: [
      row({ id: "models", categoryKey: "ai-models-assistants" }),
      row({ id: "harness", categoryKey: "agentic-coding-harness" }),
      row({ id: "caps", categoryKey: "ai-development-capabilities" }),
    ],
    want: [{ id: "agentic-ai-development", count: 3 }],
  },
  {
    label: "collects unkeyed and unknown-keyed others skills under Unassigned",
    rows: [
      row({ id: "nokey" }),
      row({ id: "badkey", categoryKey: "not-a-real-key" as OtherCategoryKey }),
    ],
    want: [{ id: UNASSIGNED_BUCKET_ID, count: 2 }],
  },
  {
    label: "keeps empty group buckets but drops an empty Unassigned bucket",
    rows: [row({ id: "seo", categoryKey: "seo-growth" })],
    want: [
      { id: "tech-stack", count: 0 },
      { id: "seo-growth", count: 1 },
    ],
  },
];

for (const expectation of table) {
  test(`bucketizeSkills: ${expectation.label}`, () => {
    const buckets = bucketizeSkills(expectation.rows);

    for (const expected of expectation.want) {
      const bucket = buckets.find((candidate) => candidate.id === expected.id);

      assert.ok(bucket, `expected a "${expected.id}" bucket`);
      assert.equal(bucket.skills.length, expected.count);
    }

    const unassigned = buckets.find(
      (candidate) => candidate.id === UNASSIGNED_BUCKET_ID,
    );

    if (
      expectation.want.every((entry) => entry.id !== UNASSIGNED_BUCKET_ID)
    ) {
      assert.ok(!unassigned, "empty Unassigned bucket should be omitted");
    }
  });
}

test("bucketizeSkills keeps stable display order across buckets", () => {
  const buckets = bucketizeSkills([
    row({ id: "a", categoryKey: "workflow-collaboration" }),
    row({ id: "b", group: "tech-stack" }),
    row({ id: "c", categoryKey: "architecture" }),
    row({ id: "d" }),
  ]);

  assert.equal(buckets[0]?.id, "tech-stack");
  assert.equal(buckets[1]?.id, "architecture");
  assert.deepEqual(
    buckets
      .filter((bucket) => bucket.skills.length > 0)
      .map((bucket) => bucket.id),
    [
      "tech-stack",
      "architecture",
      "workflow-collaboration",
      UNASSIGNED_BUCKET_ID,
    ],
  );
});
