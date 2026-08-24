import assert from "node:assert/strict";
import { test } from "node:test";

import { renderMarkdown } from "./markdown";

test("renders headings with ids and extracts an h2/h3 toc", async () => {
  const { html, toc, headingCount } = await renderMarkdown(
    [
      "# Title",
      "## Section one",
      "### Sub section",
      "## Section two",
      "#### Ignored h4",
    ].join("\n"),
  );

  assert.ok(html.includes("<h2 id=\"section-one\">"), "h2 carries a slug id");
  assert.ok(html.includes("<h3 id=\"sub-section\">"), "h3 carries a slug id");
  assert.ok(html.includes("<h4"), "h4 is still rendered");
  assert.deepEqual(toc, [
    { id: "section-one", text: "Section one", depth: 2 },
    { id: "sub-section", text: "Sub section", depth: 3 },
    { id: "section-two", text: "Section two", depth: 2 },
  ]);
  assert.equal(headingCount, 3);
});

test("GFM tables render as html tables", async () => {
  const { html } = await renderMarkdown(["| a | b |", "|---|---|", "| 1 | 2 |"].join("\n"));
  assert.ok(html.includes("<table>"), "table element present");
  assert.ok(html.includes("<td>"), "cell present");
});

test("fenced code blocks are syntax-highlighted with token classes", async () => {
  const { html } = await renderMarkdown(["```ts", "const x = 1", "```"].join("\n"));
  assert.ok(html.includes("<code class=\"hljs language-ts\">"), "hljs classes applied");
});

test("raw html passthrough is disabled (xss-safe by construction)", async () => {
  const { html } = await renderMarkdown('<script>alert(1)</script>\n\n# Safe heading');
  assert.ok(!html.includes("<script"), "no script element in output");
  assert.ok(!html.includes("<alert"), "no raw html");
});

test("malformed markdown degrades to plain rendering without throwing", async () => {
  const { html } = await renderMarkdown([
    "| broken | table",
    "<b>raw</b>",
    "### Heading still ok",
    "[unclosed link",
    "```ts",
    "unclosed fence",
  ].join("\n"));
  assert.ok(html.includes("<h3"), "heading still rendered");
  assert.ok(!html.includes("<b>raw"), "raw html stays inert");
  assert.equal(typeof html, "string");
});

test("empty markdown renders empty output with no toc", async () => {
  const { html, toc, headingCount } = await renderMarkdown("");
  assert.equal(html.trim(), "");
  assert.deepEqual(toc, []);
  assert.equal(headingCount, 0);
});

test("duplicate headings get distinct slug ids in the toc", async () => {
  const { toc } = await renderMarkdown(["## Repeat", "## Repeat"].join("\n"));
  assert.notEqual(toc[0]?.id, toc[1]?.id, "slugs are de-duplicated");
  assert.equal(toc[0]?.id, "repeat");
  assert.equal(toc[1]?.id, "repeat-1");
});