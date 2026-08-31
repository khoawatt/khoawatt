# Owner Decisions & Pre-Cutover Evidence — Production Content Migration (#16)

Source of truth for decisions: `docs/migration/wordpress-content-inventory.md`.
Owner: Khoa (repo owner). This document captures what must be decided before issue #16 (content migration) and #17 (cutover) can proceed. The inventory rule is explicit: **unknowns must not be filled with guessed content.** This document makes the unknowns answerable.

> **Answers recorded 2026-08-18** (Issue #46 thread): D1–D10 are answered below in Section 1. Issue #16 is now unblocked.

---

## 1. Owner-decision questionnaire

Each item records the current state in the repository and what is required to accept it. Answer each in the issue #46 thread.

### D1 — Final English/Vietnamese copy

- **Current state:** `src/content/profile.ts`, `src/content/skills.ts`, `src/content/projects.ts`, `src/content/resume.ts`, `src/content/contact.ts`, `src/content/footer.ts` contain draft bilingual copy treated as *source material*.
- **Question:** Approve the current EN/VI copy as final, or provide corrections per string?
- **Acceptance:** Every user-facing string across all content files is owner-approved for both locales.
- **Decision (2026-08-18):** Approve the current EN/VI content as the **production-for-now** copy. It may be revised later.
- **Update (2026-08-22):** Owner approved a Skills content refresh (bilingual): Tech Stack tab expands to exactly 20 items (TypeScript, JavaScript, Python, Node.js, NestJS, React, Next.js, MongoDB, PostgreSQL, MySQL, Docker, AWS, DigitalOcean, Firebase, Azure DevOps, Tailwind CSS, SCSS, WordPress, WSL, Linux — WSL intentionally has no brand glyph and falls back to the `{}` mark); Others tab replaces the previous 3 categories with exactly 7 owner-specified groups (Architecture; DevOps & Infrastructure; Frontend & UX; SEO & Growth; Workflow & Collaboration; Product & Creative; Agentic AI & AI Development) with per-group subtitles, skill chips, and three Agentic AI sub-sections. Canonical copy lives in `src/content/skills.ts`; production CMS rows sync through `scripts/sync-skills-content.sql` **after** the code deploys (old builds crash on unknown `icon_key` values during SSR).

### D2 — Featured project set + real Live Demo / Code URLs

- **Current state:** All 6 case-study posts from the inventory are marked `featured: true` in `src/content/projects.ts`. Live Demo destinations include YouTube links for `comestic-beauty-store`, `bakery-store`, `dynamic-global-solution-landing-page`, `scented-candles-store`; `dynamic-global-solution-landing-page` also has a GitHub code URL. `atm-seeking` and `readingtime` have no Live Demo/Code URL.
- **Inventory context:** `/case-studies/` → `/#projects` redirect is *decided conditionally* — gated on "Approved Projects section represents the collection." Per-post destinations are `Keep candidate` / `Mapping required`.
- **Question:** Which projects are featured, in what order, and what are the **real** Live Demo and Code destinations for each (or explicitly none)?
- **Acceptance:** Featured set matches the owner-approved list; every Live Demo/Code URL is verified live by the owner; missing destinations are intentionally omitted (no placeholder links).
- **Decision (2026-08-18):** Keep the current project dataset temporarily. The owner will replace it with real projects later. **This intentionally conflicts with Issue #16's "No placeholder/sample personal data remains" criterion** — recorded as an explicit owner-approved temporary-content exception; the old criterion is not silently marked satisfied.
- **Link verification (2026-08-18):** All six retained external destinations were verified live (HTTP 200): `youtube.com/watch?v=f3NrpMbqwV4`, `youtu.be/4O9kGRFmXVY`, `youtube.com/watch?v=BU1RvITWoi8`, `youtu.be/WD_NulE5_l4`, `github.com/khoawatt/Feaon-ldp-v2`, `github.com/khoawatt`. This satisfies the "All external links are real and verified" criterion for the retained dataset; `atm-seeking` and `readingtime` intentionally omit Live Demo/Code URLs.

### D3 — Public permission for employer/client names and supporting employment evidence

- **Current state:** `src/content/resume.ts` publishes employer names: Dynamic Global Solutions, EnglishWing, SmartIT, Zenitech. The Dynamic Global Solution landing page project references the same company. The inventory also lists supporting employment evidence such as the **EnglishWing employment confirmation** (`quachvoanhkhoa-certificate-2.jpg` in `docs/migration/legacy-assets/`) as `Archive / Replace` — "Contains signatures, seal, and employment document text. Keep privately unless an explicitly approved redacted derivative is needed."
- **Inventory context:** "Verify employer naming, dates, confidentiality, and approved public wording" and whether employment-confirmation evidence may be publicly referenced.
- **Questions:**
  1. Is each employer/client name + project reference approved for public display? Any rewordings required?
  2. May any supporting employment evidence (e.g. the EnglishWing confirmation) be publicly referenced or published? If so, under what derivative/redaction policy?
- **Acceptance:** Every employer/client name and project association is explicitly approved or corrected; the publication/redaction status of supporting employment evidence is explicitly decided (private / public-with-redaction / text-only reference), with no silent assumption either way.
- **Decision (2026-08-18):** Do **not** publish employer/client names or supporting employment evidence. Remove or rewrite public content as necessary **without inventing replacement companies or facts**.
- **Amendment (2026-08-18, owner decision reversal):** The owner revised this decision after seeing the MVP resume felt incomplete. All four employer names (Dynamic Global Solutions, EnglishWing, SmartIT, Zenitech) and their detailed legacy descriptions are published again in the Career Journey, and the EnglishWing employment confirmation image is published as a certificate derivative. This is gated by the resume section publicity mechanism (private by default — see new decision record below), so nothing sensitive is served publicly until the owner flips the config to `visible`.

### Resume section publicity mechanism (added 2026-08-18)

- **Decision (2026-08-18):** The resume section has a config-driven publicity gate: `src/content/site-config.ts` → `sections.resume.publicity`, defaulting to **`private`**. The gate is enforced at the **server boundary**: when private, `src/app/[locale]/page.tsx` does not construct the resume view model at all — it renders a server component lock overlay from `getResumeLockContent` (public-safe strings only), so no employer names, links, or media paths are ever serialized into the client component props or RSC payload (cannot be scraped from DOM or HTML). Certificate media is not served from `public/`; the files live in `private-assets/resume/` and are delivered only through the gated route `src/app/api/resume-media/[file]/route.ts`, which returns 404 unless publicity is `visible`. When the owner is applying for roles, they set the value to `visible` and deploy; the full component renders as before. This is the MVP config-based mechanism; the future CMS/admin route (Issue 19) may drive the same value at runtime.

### D4 — Certificate publication / redaction policy

- **Current state:** Resume entries reference education and certifications (Bachelor's degree, TOEIC, Basic IT Application Certificate, Codeforces profile). No certificate images are wired into `src/content/resume.ts` media, but `docs/migration/legacy-assets/` contains raw certificate JPEGs.
- **Inventory context:** Raw certificate images contain birth/credential identifiers; "raw public use is not approved."
- **Question:** Which certificates publish structured text only vs. an approved redacted derivative? What is the redaction policy?
- **Acceptance:** Certificate media policy is explicit; any published derivative is owner-approved and redacted; raw originals stay out of `public/`.
- **Decision (2026-08-18):** Certificate content may be visible **similarly to the legacy WordPress portfolio**. Inspect the required source assets under `docs/migration/legacy-assets/`; use only the needed assets, with intentional production paths, dimensions, localized alt text, and the existing resume/lightbox behavior. Do not invent certificate data.
- **Redaction exception (2026-08-18):** Explicit owner-approved exception to the "redacted derivative" acceptance above. The published derivatives (Bachelor's degree, TOEIC, Basic IT Application) are production-sized/compressed versions of the legacy source scans and **are not redacted** — they expose the same identifiers present in the legacy scans, which the legacy WordPress portfolio also published publicly. Raw originals remain outside `public/`. This exception applies only to the three D4/D10-required certificate assets.
- **Amendment (2026-08-18, owner decision reversal):** The owner expanded the exception to publish **all** certificate-related media, matching the legacy `/resume/` page: the academic **transcript** (`certificate-4` → `transcript.jpg`) is added to the Bachelor's degree entry and the **EnglishWing employment confirmation** (`certificate-2` → `englishwing-employment.jpg`) to the EnglishWing career entry. All five certificate derivatives (bachelor, TOEIC, basic IT, transcript, EnglishWing confirmation) are unredacted production copies of the legacy scans; raw originals stay out of `public/` and the derivatives are delivered via the gated `/api/resume-media/` route from `private-assets/resume/`. The Codeforces **screenshot** is NOT published — a live profile link is used instead per the inventory recommendation (screenshot contains an email address and goes stale). Publication is additionally gated by the resume publicity mechanism (private by default).

### D5 — Current downloadable CV file + stable URL

- **Current state:** No `resumeUrl` in `src/content/profile.ts`. No CV file is wired.
- **Inventory context:** Old WordPress-upload CV PDFs are `Unknown / Replace` — "Obtain one current, owner-approved CV and decide its stable production URL."
- **Question:** Is there a current CV to publish? If so, what file (outside `legacy-assets/`) and what stable URL?
- **Acceptance:** CV (if any) is a current owner-approved file with a decided stable URL; old upload URLs are handled per a decided redirect/retention policy.
- **Decision (2026-08-18):** No current CV is available. Do **not** create a fake CV URL or fake downloadable file. Omit the CV link/action until the owner supplies a real file and stable URL.

### D6 — Blog-retention mechanism

- **Current state:** No blog UI or hosting in the MVP. `/blog/` and the four tech-blog posts are `Migrate later` — "retain the URL/content until a separate blog migration or retirement plan is approved." Hosting mechanism unresolved.
- **Question:** Which mechanism — staged content migration, retained legacy hosting, or archive/410 — and when?
- **Acceptance:** A mechanism is chosen (see Section 4 for options); the chosen mechanism is recorded here with an owner-approved timeline.
- **Decision (2026-08-18):** Do **not** implement a blog in the Next.js MVP.

### D7 — Per-route 410 / redirect handling for non-migrated case studies and low-value archives

- **Current state:** Only `/resume/` → `/#resume` and `/case-studies/` → `/#projects` redirects are implemented (and `/resume/` is gated on content verification). Case-study post URLs, categories, tags, author, `/blocks/*` remain candidates.
- **Inventory context:** "Later, redirect archives to an equivalent collection only if it exists; otherwise evaluate `410 Gone` after checking Search Console/backlinks. Do not redirect all secondary URLs to the homepage."
- **Question:** For each remaining route group, what is the decision (equivalent collection redirect, retain, or 410) after Search Console/backlink review?
- **Acceptance:** Per-route-group handling is decided; no blanket homepage redirects.
- **Decision (2026-08-18):** Owner redirect policy:
  - legacy URL with a **meaningful equivalent** in the new portfolio → redirect to that new equivalent;
  - legacy URL with **no equivalent** → redirect to the homepage.
  This is an explicit owner override of the previous inventory guidance against blanket homepage redirects. Cutover redirect execution belongs to Issue #17; Issue #16 does not activate unrelated cutover redirects.

### D8 — Contact / social destinations

- **Current state:** `src/content/contact.ts` publishes GitHub (`https://github.com/khoawatt`) only. No verified email, phone, or location.
- **Inventory context:** "The live destinations were not accepted as final content by Issue #2; verify each before publication."
- **Question:** Which contact/social destinations are final (GitHub, email, LinkedIn, etc.)? Are email/phone/location intentionally public?
- **Acceptance:** Contact/social values are owner-approved and verified; absent values are intentionally omitted.
- **Decision (2026-08-18):** Keep current contact/social destinations **as-is** — currently GitHub only. Do **not** invent email, phone, location, LinkedIn, or other destinations.
- **Update (2026-08-22):** Owner supplied verified contact details — email `contact@khoawatt.com`, phone `+84 704823238`, location Ho Chi Minh, Vietnam. These now publish in `src/content/contact.ts` (email/phone as links, location plain text). Social set stays Facebook, Instagram, GitHub (`khoawatt`), X, LinkedIn; unconfigured socials render non-interactive until real URLs are provided.
- **Update (2026-08-22, later):** Owner added a Threads profile to the CMS (`social_links` row `thread` → `https://www.threads.com/khoawatt`). The `thread` platform is now supported end-to-end: `SocialPlatform` union, Simple Icons Threads glyph, static default, and the CMS platform allow-list (previously the row was silently filtered out).

### D9 — About FEAON role

- **Current state:** The legacy homepage's "About FEAON / mission copy" was `Archive`d (excluded from the personal portfolio MVP). No About FEAON block exists in the current site.
- **Question:** Does About FEAON have any approved future role in the personal portfolio? If yes, what?
- **Acceptance:** A decision is recorded (include/never/include differently).
- **Decision (2026-08-18):** About FEAON has no role in this personal portfolio. Keep it excluded.

### D10 — Complete uploads inventory

- **Current state:** `docs/migration/wordpress-content-inventory.md` notes the uploads export is "Incomplete / unknown" for homepage portraits/logo and some inline post media. The local `legacy-assets/` is a partial subset.
- **Question:** Where is the verified, complete `wp-content/uploads` export, and which originals map to which production assets?
- **Acceptance:** A verified uploads inventory exists (kept outside this repo) covering all production media references.
- **Decision (2026-08-18):** The owner confirms the migration assets needed for this portfolio are available locally under `docs/migration/legacy-assets/`. Inspect that directory and map only the assets required by Issue #16.

---

## 2. Draft-content gap audit (current `src/content/*` vs. inventory)

This flags every place current content relies on an unresolved inventory decision. Flagged items must not ship to production until resolved.

| File | Item | Status vs. inventory | Blocker |
|---|---|---|---|
| `src/content/projects.ts` | All 6 case studies `featured: true` | Draft; featured set unapproved | D2 |
| `src/content/projects.ts` | YouTube `liveDemoUrl` for 4 projects; GitHub code for DGS landing | Destinations unverified/unapproved | D2 |
| `src/content/projects.ts` | `atm-seeking`, `readingtime` no Live Demo/Code | Intentionally omitted? unconfirmed | D2 |
| `src/content/projects.ts` | Dynamic Global Solution references company name | Publication permission unverified | D3 |
| `src/content/resume.ts` | Employer names (DGS, EnglishWing, SmartIT, Zenitech) | Publication permission unverified | D3 |
| `docs/migration/legacy-assets/` | EnglishWing employment confirmation (`quachvoanhkhoa-certificate-2.jpg`) | Publication/redaction status undecided | D3 |
| `src/content/resume.ts` | Education/cert entries (degree, TOEIC, IT cert, Codeforces) | Text-only; media policy unresolved | D4 |
| `src/content/resume.ts` | `media` arrays empty (no certificate images wired) | Consistent with "no raw publication"; needs policy | D4 |
| `src/content/profile.ts` | No `resumeUrl` | CV unknown | D5 |
| `src/content/contact.ts` | GitHub only; no email/phone/location | Destinations unverified | D8 |
| `src/content/footer.ts` | Socials reuse GitHub only | Destinations unverified | D8 |
| `src/proxy.ts` | `/resume/` → `/#resume`, `/case-studies/` → `/#projects` | Implemented; `/resume/` gated on content approval | D1–D5 (content), D7 (secondary routes) |

---

## 3. Proposed acceptance criteria for issue #16

GitHub issue #16 already defines seven acceptance criteria:

1. No placeholder/sample personal data remains in production sections.
2. All external links are real and verified.
3. Missing optional links are omitted rather than faked.
4. EN/VI content is complete for launch-critical UI.
5. Image alt text and media dimensions are supplied.
6. No private/unapproved personal data is published.
7. `lint`, `typecheck`, content validation/tests, and build pass.

The criteria below are **additive/refined** — they do not replace the above; they operationalize how the owner decisions (D1–D10) satisfy #16's existing criteria:

1. Featured project set and order match the owner-approved list (D2) — satisfies #16 criterion 1/2. *(Owner-approved temporary-content exception per D2: the current project dataset is retained temporarily and is explicitly NOT treated as satisfying criterion 1.)*
2. Every rendered Live Demo/Code URL is owner-verified live; missing destinations are intentionally omitted (D2) — satisfies #16 criterion 2/3.
3. All four employer names and detailed legacy descriptions are published in the Career Journey (D3 amended) — satisfies #16 criterion 6 under the publicity gate.
4. Certificate derivatives are intentional production assets (paths, dimensions, localized alt text, resume/lightbox behavior) derived only from required legacy-assets (D4/D10 amended): bachelor, TOEIC, basic IT, transcript, EnglishWing employment confirmation; raw originals stay out of `public/`; Codeforces uses a live profile link, not the screenshot — satisfies #16 criterion 5/6 under the publicity gate.
5. CV link/action is omitted until a real file and stable URL exist (D5) — satisfies #16 criterion 1/2/3.
6. Contact/social destinations match the owner-approved set (GitHub only) (D8) — satisfies #16 criterion 2.
7. Final EN/VI copy is owner-approved across all content files (D1) — satisfies #16 criterion 4.
8. No bytes from `docs/migration/legacy-assets/` are moved into `public/` or the runtime bundle — supports #16 criterion 6.
9. Redirect activation follows decisions (D7): equivalent legacy URLs redirect to their equivalent; non-equivalent legacy URLs redirect to the homepage; execution belongs to Issue #17. *(Cutover guard — does not map to an existing #16 criterion; tracked under #17.)*
10. Resume section publicity is config-driven and defaults to `private`; when private the resume content is **not constructed or passed to any client component** (server boundary — lock overlay from public-safe strings only) and certificate media is served only through the gated `/api/resume-media/[file]` route (404 while private) — satisfies #16 criterion 6 privacy requirement at the delivery boundary.

---

## 4. Blog-retention mechanism options (analysis only — choice is owner's)

The blog is `Migrate later`; the hosting mechanism is the unresolved decision (D6).

| Option | Description | Pros | Cons | Decision criteria |
|---|---|---|---|---|
| A. Staged content migration | Migrate the 4 blog posts into the Next.js app (separate scope) with retained slugs | Single stack, SEO continuity, no legacy dependency | Scope beyond MVP; content review needed | Blog is valuable long-term; timeline allows |
| B. Retained legacy hosting | Keep WordPress serving `/blog/` + posts while Next.js serves the rest | Zero migration work; no content loss | Two stacks to operate; redirect/proxy complexity; cost | Short-term, blog rarely updated |
| C. Archive / 410 | Remove blog from sitemap, serve 410 after backlink/index review | Clean cutover | Loses indexed content; needs Search Console evidence | Blog has no ongoing value; backlinks negligible |

Recommended evaluation order: check Search Console/backlink value first, then choose A if the blog is worth keeping, C if not, B only as a transitional measure.

---

## 5. Pre-cutover evidence checklist (owner-executable)

These are external operational prerequisites from the inventory. **All private artifacts live outside this repository.** Nothing below is committed to the repo.

- [ ] Export the WordPress database; record export time, WP version, and integrity/checksum evidence in an approved private location.
- [ ] Export all required `wp-content/uploads` originals to an approved private location (not just the local Issue #2 subset).
- [ ] Preserve current sitemap XML, REST content/metadata, redirect/plugin configuration, and permalink settings.
- [ ] Export Search Console indexed URLs, top landing pages, backlinks if available, and recent 404s.
- [ ] Verify both database and uploads backups can be read/restored before any destructive change.
- [ ] Record backup owner, storage location, retention period, rollback owner, and rollback decision point outside the public repository.
- [ ] Re-crawl immediately before cutover and diff against the 2026-08-12 snapshot.
- [ ] Confirm the blog-retention mechanism (D6) is chosen and operational.
- [ ] Confirm D1–D10 answers are recorded and reflected in `src/content/*`.
- [ ] Verify per-route handling (D7) against the pre-cutover URL export.

---

## Related

- Issue #46 (this decision capture)
- `docs/migration/wordpress-content-inventory.md`
- `docs/06-issue-breakdown.md` (roadmap; #46 gates #16)
