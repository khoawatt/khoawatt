import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SOCIAL_PLATFORMS,
  isSocialPlatform,
} from "@/content/contact";
import {
  assertSocialGlyphCoverage,
  socialGlyphs,
} from "@/components/sections/contact/social-glyphs";

test("SOCIAL_PLATFORMS contains no duplicates", () => {
  const unique = new Set(SOCIAL_PLATFORMS);
  assert.equal(unique.size, SOCIAL_PLATFORMS.length);
});

test("every platform has an icon glyph (vocabulary registry is complete)", () => {
  assert.doesNotThrow(assertSocialGlyphCoverage);
  for (const platform of SOCIAL_PLATFORMS) {
    assert.ok(socialGlyphs[platform], `glyph for ${platform}`);
  }
});

test("isSocialPlatform accepts only known platforms", () => {
  for (const platform of SOCIAL_PLATFORMS) {
    assert.equal(isSocialPlatform(platform), true);
  }
  assert.equal(isSocialPlatform("myspace"), false);
  assert.equal(isSocialPlatform("github.com"), false);
  assert.equal(isSocialPlatform(""), false);
});

test("glyph registry keys exactly match the platform list", () => {
  const glyphKeys = Object.keys(socialGlyphs).sort();
  const platformKeys = [...SOCIAL_PLATFORMS].sort();
  assert.deepEqual(glyphKeys, platformKeys);
});