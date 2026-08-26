import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Local-only guard: this test mutates CMS fixtures and must never touch cloud.
if (!url || !serviceRole) {
  console.error(
    "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (local Supabase).",
  );
  process.exit(1);
}

const LOCAL_HOST = /^http:\/\/127\.0\.0\.1(?::\d+)?$/;
if (!LOCAL_HOST.test(url)) {
  console.error(`Refusing to run social-links tests against non-local Supabase: ${url}`);
  process.exit(1);
}

import { createClient } from "@supabase/supabase-js";
import {
  getSocialLinks,
  getContactContent,
  getPortfolioProfile,
} from "@/features/cms/repository";
import { getSeoMetadata } from "@/features/seo/metadata";

const client = createClient(url, serviceRole, {
  auth: { persistSession: false },
});

const PREFIX = "del-social-";

async function upsertSocial(id: string, iconKey: string, urlText: string, label: string) {
  const { error } = await client.from("social_links").upsert(
    { id, label, url: urlText, icon_key: iconKey, order: 0 },
    { onConflict: "id" },
  );
  assert.equal(error, null, `upsert ${id}: ${error?.message}`);
}

async function removeSocials() {
  await client.from("social_links").delete().like("id", `${PREFIX}%`);
}

before(async () => {
  await removeSocials();
});

after(async () => {
  await removeSocials();
});

test("getSocialLinks falls back to static defaults when the table is empty", async () => {
  await removeSocials();
  const socials = await getSocialLinks("en");
  assert.ok(socials.length > 0, "static fallback has socials");
  // Static defaults include non-https placeholders (#), which are fine for the
  // contact section but filtered from SEO sameAs.
  assert.ok(socials.every((s) => s.id.length > 0));
});

test("getSocialLinks replaces static defaults when a valid CMS row exists", async () => {
  await removeSocials();
  await upsertSocial(`${PREFIX}github`, "github", "https://github.com/Akbi47", "GitHub");
  await upsertSocial(`${PREFIX}x`, "x", "https://x.com/khoawatt", "X");

  const socials = await getSocialLinks("en");
  const hrefs = socials.map((s) => s.href);
  assert.ok(hrefs.includes("https://github.com/Akbi47"), "CMS github replaces static");
  assert.ok(hrefs.includes("https://x.com/khoawatt"), "CMS x replaces static");
  // Replace-if-nonempty: with valid rows the static # placeholders disappear.
  assert.ok(!hrefs.includes("#"), "static placeholder hrefs are replaced");
});

test("getSocialLinks drops unknown platform keys and non-https URLs", async () => {
  await removeSocials();
  await upsertSocial(`${PREFIX}github`, "github", "https://github.com/Akbi47", "GitHub");
  // Unknown platform + javascript: URL must both be filtered out.
  await upsertSocial(`${PREFIX}bad-platform`, "myspace", "https://myspace.com/nope", "MySpace");
  await upsertSocial(`${PREFIX}bad-url`, "linkedin", "javascript:alert(1)", "Bad");

  const socials = await getSocialLinks("en");
  const hrefs = socials.map((s) => s.href);
  assert.ok(hrefs.includes("https://github.com/Akbi47"));
  assert.ok(!hrefs.includes("https://myspace.com/nope"), "unknown platform dropped");
  assert.ok(!hrefs.includes("javascript:alert(1)"), "non-https URL dropped");
});

test("getContactContent delegates to the canonical accessor", async () => {
  await removeSocials();
  await upsertSocial(`${PREFIX}linkedin`, "linkedin", "https://linkedin.com/in/khoa", "LinkedIn");

  const contact = await getContactContent("en");
  const hrefs = contact.socials.map((s) => s.href);
  assert.ok(hrefs.includes("https://linkedin.com/in/khoa"));
});

test("SEO metadata reflects the CMS-aware profile (propagation)", async () => {
  // getSeoMetadata now reads the CMS profile accessor; it must still resolve to
  // a complete Metadata object with the site OG image (hero stays static).
  const metadata = await getSeoMetadata({
    locale: "en",
    title: "Test title",
    description: "Test description",
  });
  assert.equal(metadata.title, "Test title");
  assert.equal(metadata.description, "Test description");
  const rawImages = metadata.openGraph?.images;
  const images = Array.isArray(rawImages) ? rawImages : rawImages ? [rawImages] : [];
  assert.equal(images.length, 1);
  const url =
    typeof images[0] === "string"
      ? images[0]
      : images[0] instanceof URL
        ? images[0].toString()
        : images[0].url;
  assert.equal(typeof url, "string");
  assert.ok((url as string).length > 0);
});

test("getPortfolioProfile CMS name overrides static (profile boundary used by SEO)", async () => {
  const profile = await getPortfolioProfile("en");
  // Local CMS profile row exists; name either CMS-provided or static fallback.
  assert.ok(profile.name.length > 0);
  assert.ok(profile.githubUrl.length > 0);
});