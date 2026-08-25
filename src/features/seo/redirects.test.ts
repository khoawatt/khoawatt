import assert from "node:assert/strict";
import { test } from "node:test";

import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

import {
  buildRedirectUrl,
  getLegacyRedirectTarget,
  normalizeTrailingSlash,
} from "./redirects";

type RedirectCase = {
  legacy: string;
  expectedHash: string;
};

const equivalentCases: RedirectCase[] = [
  { legacy: "/resume", expectedHash: "#resume" },
  { legacy: "/resume/", expectedHash: "#resume" },
  { legacy: "/case-studies", expectedHash: "#projects" },
  { legacy: "/case-studies/", expectedHash: "#projects" },
  { legacy: "/category/case-studies", expectedHash: "#projects" },
  { legacy: "/category/case-studies/", expectedHash: "#projects" },
  { legacy: "/atm-seeking", expectedHash: "#projects" },
  { legacy: "/readingtime/", expectedHash: "#projects" },
  { legacy: "/comestic-beauty-store", expectedHash: "#projects" },
  { legacy: "/bakery-store", expectedHash: "#projects" },
  {
    legacy: "/dynamic-global-solution-landing-page",
    expectedHash: "#projects",
  },
  { legacy: "/scented-candles-store", expectedHash: "#projects" },
];

const homepageCases: RedirectCase[] = [
  { legacy: "/what-is-a-web-server", expectedHash: "" },
  { legacy: "/identify-a-seo-standard-website", expectedHash: "" },
  { legacy: "/javascript-code-compilation-process", expectedHash: "" },
  { legacy: "/a-brief-introduction-to-nextjs", expectedHash: "" },
  { legacy: "/category/tech-blog", expectedHash: "" },
  { legacy: "/category/tech-blog/", expectedHash: "" },
  { legacy: "/author/superuser", expectedHash: "" },
  { legacy: "/tag/cloud", expectedHash: "" },
  { legacy: "/tag/ecommerce", expectedHash: "" },
  { legacy: "/tag/edtech", expectedHash: "" },
  { legacy: "/tag/fb", expectedHash: "" },
  { legacy: "/tag/health-beauty", expectedHash: "" },
  { legacy: "/tag/javascript-news", expectedHash: "" },
  { legacy: "/tag/landing-page", expectedHash: "" },
  { legacy: "/tag/lifestyle", expectedHash: "" },
  { legacy: "/tag/lms", expectedHash: "" },
  { legacy: "/tag/nestjs", expectedHash: "" },
  { legacy: "/tag/nextjs", expectedHash: "" },
  { legacy: "/tag/nextjs-news", expectedHash: "" },
  { legacy: "/tag/reactjs", expectedHash: "" },
  { legacy: "/tag/seo-news", expectedHash: "" },
  { legacy: "/tag/utility", expectedHash: "" },
  { legacy: "/tag/web", expectedHash: "" },
  { legacy: "/tag/web-news", expectedHash: "" },
  { legacy: "/tag/wordpress", expectedHash: "" },
  { legacy: "/blocks/header", expectedHash: "" },
  { legacy: "/blocks/footer", expectedHash: "" },
  { legacy: "/blocks/recent-case-studies", expectedHash: "" },
  { legacy: "/blocks/recent-posts", expectedHash: "" },
  { legacy: "/blocks/header/deeper", expectedHash: "" },
];

const redirectCases: ReadonlyArray<RedirectCase> = [
  ...equivalentCases,
  ...homepageCases,
];

test("legacy redirect matrix: en resolves to the localized root", () => {
  for (const redirectCase of redirectCases) {
    assert.deepEqual(
      getLegacyRedirectTarget("en", redirectCase.legacy),
      { pathname: "/", hash: redirectCase.expectedHash },
      `legacy path "${redirectCase.legacy}" should redirect on en`,
    );
  }
});

test("legacy redirect matrix: vi resolves to the /vi root", () => {
  for (const redirectCase of redirectCases) {
    assert.deepEqual(
      getLegacyRedirectTarget("vi", redirectCase.legacy),
      { pathname: "/vi", hash: redirectCase.expectedHash },
      `legacy path "${redirectCase.legacy}" should redirect on vi`,
    );
  }
});

test("no legacy rule targets another legacy route (no redirect chains)", () => {
  for (const redirectCase of redirectCases) {
    const target = getLegacyRedirectTarget("en", redirectCase.legacy);
    assert.ok(target, `legacy path "${redirectCase.legacy}" should match`);
    assert.equal(target.pathname, "/");
    assert.equal(
      getLegacyRedirectTarget("en", target.pathname),
      null,
      `"${target.pathname}" must never be a legacy input`,
    );
  }
});

test("legacy redirect: unknown and unlisted paths return null", () => {
  for (const pathname of [
    "/",
    "/contact",
    "/skills",
    "/blogging",
    "/tag",
    "/blocks",
    "/blog",
    "/blog/smoke-post",
  ]) {
    assert.equal(getLegacyRedirectTarget("en", pathname), null, pathname);
  }
});

test("legacy redirect: query string is preserved through the redirect URL", () => {
  const target = getLegacyRedirectTarget("en", "/resume/");
  assert.ok(target);
  const url = buildRedirectUrl(
    "https://example.com",
    target.pathname,
    "?utm_source=x",
    target.hash,
  );
  assert.equal(url.toString(), "https://example.com/?utm_source=x#resume");
});

test("legacy redirect: homepage fallback keeps the query string", () => {
  const target = getLegacyRedirectTarget("vi", "/what-is-a-web-server/");
  assert.ok(target);
  const url = buildRedirectUrl(
    "https://example.com",
    target.pathname,
    "?from=wp",
    target.hash,
  );
  assert.equal(url.toString(), "https://example.com/vi?from=wp");
});

test("legacy redirect: permanent 301 status at the proxy boundary", () => {
  const request = new NextRequest("https://example.com/resume/");
  const response = proxy(request);
  assert.equal(response.status, 301);
});

test("legacy redirect: proxy redirect preserves the query string", () => {
  const request = new NextRequest(
    "https://example.com/case-studies/?utm_source=x",
  );
  const response = proxy(request);
  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://example.com/?utm_source=x#projects",
  );
});

test("legacy redirect: en-prefixed legacy URL redirects directly (no chain)", () => {
  const request = new NextRequest("https://example.com/en/resume/?x=1");
  const response = proxy(request);
  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://example.com/?x=1#resume",
  );
});

test("legacy redirect: en-prefixed case-studies URL redirects directly", () => {
  const request = new NextRequest("https://example.com/en/case-studies/");
  const response = proxy(request);
  assert.equal(response.status, 301);
  assert.equal(
    response.headers.get("location"),
    "https://example.com/#projects",
  );
});

test("trailing slash: /vi/ normalizes to /vi", () => {
  assert.equal(normalizeTrailingSlash("/vi/"), "/vi");
});

test("trailing slash: multiple slashes collapse", () => {
  assert.equal(normalizeTrailingSlash("/vi//"), "/vi");
});

test("trailing slash: root is untouched", () => {
  assert.equal(normalizeTrailingSlash("/"), null);
});

test("trailing slash: path without slash is untouched", () => {
  assert.equal(normalizeTrailingSlash("/vi"), null);
});

test("redirect url: query string precedes the fragment", () => {
  const target = buildRedirectUrl(
    "http://localhost:3000",
    "/",
    "?utm_source=x",
    "#resume",
  );

  assert.equal(target.pathname, "/");
  assert.equal(target.search, "?utm_source=x");
  assert.equal(target.hash, "#resume");
  assert.equal(
    target.toString(),
    "http://localhost:3000/?utm_source=x#resume",
  );
});

test("redirect url: vi locale keeps query before fragment", () => {
  const target = buildRedirectUrl(
    "http://localhost:3000",
    "/vi",
    "?utm_source=x",
    "#projects",
  );

  assert.equal(
    target.toString(),
    "http://localhost:3000/vi?utm_source=x#projects",
  );
});
