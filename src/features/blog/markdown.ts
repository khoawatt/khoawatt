/**
 * Server-side Markdown pipeline (blog design spec §5).
 *
 * One remark/rehype pipeline shared verbatim by public article pages and the
 * admin Preview:
 *   - GFM (tables, task lists, strikethrough, autolinks)
 *   - heading slugs restricted to h2/h3 for TOC extraction
 *   - syntax highlighting for fenced code blocks (token classes; the per-theme
 *     palettes are a CSS concern applied in the UI slice)
 *   - raw HTML passthrough is disabled by construction (remark-rehype without
 *     `allowDangerousHtml`), so authoring stays pure Markdown and the output is
 *     XSS-safe without a separate sanitizer
 *   - output: sanitized HTML string + `{ toc, headingCount }` metadata
 *
 * Malformed Markdown degrades to plain rendering, never a thrown error.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";

import type { TocEntry } from "./types";

export interface MarkdownResult {
  html: string;
  toc: TocEntry[];
  headingCount: number;
}

/** Rehype transformer: collect h2/h3 headings (after `rehype-slug` assigns ids). */
function collectToc(tree: import("hast").Root): TocEntry[] {
  const toc: TocEntry[] = [];
  visit(tree, "element", (node) => {
    if (node.tagName !== "h2" && node.tagName !== "h3") return;
    const id = node.properties?.id;
    if (typeof id === "string") {
      toc.push({
        id,
        text: toString(node),
        depth: node.tagName === "h2" ? 2 : 3,
      });
    }
  });
  return toc;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  .use(rehypeHighlight)
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string): Promise<MarkdownResult> {
  const tree = processor.runSync(processor.parse(markdown));

  const toc = collectToc(tree);
  const html = processor.stringify(tree);
  return { html, toc, headingCount: toc.length };
}