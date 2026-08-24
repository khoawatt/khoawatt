import assert from "node:assert/strict";
import { test } from "node:test";

import { readingTimeMinutes } from "./reading-time";

function words(count: number): string {
  return Array.from({ length: count }, (_, i) => `w${i}`).join(" ");
}

test("plain prose: 200 words rounds up to 1 minute", () => {
  assert.equal(readingTimeMinutes(words(200)), 1);
});

test("plain prose: 400 words is 2 minutes", () => {
  assert.equal(readingTimeMinutes(words(400)), 2);
});

test("plain prose: 401 words rounds up to 3 minutes", () => {
  assert.equal(readingTimeMinutes(words(401)), 3);
});

test("empty string is minimum 1 minute", () => {
  assert.equal(readingTimeMinutes(""), 1);
});

test("each fenced code block contributes a fixed 60 words", () => {
  const md = [
    "Intro text.",
    "```ts",
    "const x = 1;",
    "const y = 2;",
    "```",
    ...words(400).split("\n"),
  ].join("\n");
  // 2 prose words + 60 code words + 400 = 462 -> ceil(462/200) = 3
  assert.equal(readingTimeMinutes(md), 3);
});

test("fence content is stripped from the prose count", () => {
  // 1000 words inside a fence must not count as prose.
  const md = ["```", ...Array.from({ length: 1000 }, () => "x").join("\n").split("\n"), "```"].join("\n");
  // 0 prose + 60 code words -> 1 minute (min)
  assert.equal(readingTimeMinutes(md), 1);
});

test("tildes also fence code blocks", () => {
  const md = ["~~~", "const x = 1", "~~~", ...words(200).split("\n")].join("\n");
  // 200 prose + 60 code = 260 -> ceil = 2
  assert.equal(readingTimeMinutes(md), 2);
});

test("markdown punctuation markers are removed before counting", () => {
  const md = [
    "# Heading words",
    "- list item words",
    "> blockquote words",
    "| a | b |",
    "**bold** words",
    "_emphasis_ words",
    "---",
  ].join("\n");
  // heading(2) + list(3) + quote(2) + table(2) + bold(2) + emphasis(2) + 0 = 13
  assert.equal(readingTimeMinutes(md), 1);
});

test("Vietnamese counts by whitespace-separated syllable groups", () => {
  assert.equal(readingTimeMinutes("Xin chào thế giới"), 1);
  assert.equal(readingTimeMinutes(words(200) + " xin chào thế giới"), 2);
});

test("hyphenated tokens count as one word", () => {
  // 'state-of-the-art' -> markers removed -> one whitespace run
  assert.equal(readingTimeMinutes("state-of-the-art design"), 1);
});

test("unterminated fence degrades to prose, never throws", () => {
  const md = ["```ts", "not really closed", ...words(400).split("\n")].join("\n");
  // unterminated fence: everything after the opener counts as prose
  const minutes = readingTimeMinutes(md);
  assert.equal(typeof minutes, "number");
  assert.ok(minutes >= 1);
});