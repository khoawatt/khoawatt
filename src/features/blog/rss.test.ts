import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRssFeed } from "./rss";
import type { RssPostRow } from "./repository";

const posts: RssPostRow[] = [
  {
    title: "Hello & welcome",
    slug: "hello-welcome",
    summary: "A summary with <tags> & entities.",
    publishedAt: "2026-08-20T00:00:00Z",
  },
  {
    title: "Second post",
    slug: "second-post",
    summary: "Plain summary.",
    publishedAt: "2026-08-15T00:00:00Z",
  },
];

test("rss feed: en channel + item structure and URLs", () => {
  const xml = buildRssFeed("en", posts, "Khoa Watt", "Blog intro.");
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('<rss version="2.0"'));
  assert.ok(xml.includes("<title>Khoa Watt</title>"));
  assert.ok(xml.includes("<description>Blog intro.</description>"));
  assert.ok(xml.includes('rel="self" type="application/rss+xml"'));
  assert.ok(xml.includes("https://khoawatt.com/feed.xml"));
  assert.ok(xml.includes("https://khoawatt.com/blog/hello-welcome"));
  assert.ok(xml.includes("<guid>https://khoawatt.com/blog/hello-welcome</guid>"));
  assert.ok(xml.includes("<pubDate>Thu, 20 Aug 2026 00:00:00 GMT</pubDate>"));
});

test("rss feed: vi channel uses /vi feed and /vi/blog URLs", () => {
  const xml = buildRssFeed("vi", posts, "Quách Võ Anh Khoa", "Giới thiệu blog.");
  assert.ok(xml.includes("https://khoawatt.com/vi/feed.xml"));
  assert.ok(xml.includes("https://khoawatt.com/vi/blog/hello-welcome"));
  assert.ok(xml.includes("<title>Quách Võ Anh Khoa</title>"));
});

test("rss feed: XML entities are escaped", () => {
  const xml = buildRssFeed("en", posts, "Khoa Watt", "Intro.");
  assert.ok(xml.includes("<title>Hello &amp; welcome</title>"));
  assert.ok(xml.includes("A summary with &lt;tags&gt; &amp; entities."));
  assert.ok(!xml.includes("<tags>"));
});

test("rss feed: empty post list yields a channel with no items", () => {
  const xml = buildRssFeed("en", [], "Khoa Watt", "Intro.");
  assert.ok(xml.includes("<channel>"));
  assert.ok(xml.includes("</channel>"));
  assert.ok(!xml.includes("<item>"));
});

test("rss feed: each post yields one item in order", () => {
  const xml = buildRssFeed("en", posts, "Khoa Watt", "Intro.");
  const itemCount = (xml.match(/<item>/g) ?? []).length;
  assert.equal(itemCount, 2);
  assert.ok(xml.indexOf("Hello &amp; welcome") < xml.indexOf("Second post"));
});