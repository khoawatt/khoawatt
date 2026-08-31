# Plan v2 — Advanced Delete với Trash, Audit và Storage Retry

> **Nguồn:** ChatGPT vòng 1 `6a95324f` (approve-with-changes) + quyết định owner 2026-08-31 + ChatGPT vòng 2 `request-changes` (14 blocking).
> **Trạng thái:** Draft v3 — đã sửa toàn bộ blocking, chờ verdict vòng 3 trước khi tách issues.

## 0. Quyết định đã lock (8 điểm)

| # | Câu hỏi | Chốt |
|---|---------|------|
| 1 | Trash | **Có** — mọi entity deletable đều soft delete (`deleted_at`), có Trash UI, Restore, Hard delete sau retention. `profile` cũng có `deleted_at` (singleton, không hard delete ngay) |
| 2 | Bulk partial | **Đúng** — `10 chọn → 8 xóa ngay, 2 giữ lại + báo blocked` (không rollback cả batch) |
| 3 | Cover/avatar khi media bị xóa | **SET NULL** — `blog_posts.cover_bucket_path = NULL`, không bắt chọn thay thế |
| 4 | Media trong rich text (`content_md`) | **Xóa node** — remove embedded image node chính xác (parser), không giữ placeholder `![]()` |
| 5 | Category bị xóa | **Reassign sang `uncategorized`** — tạo sẵn `uncategorized` (protected), mọi `blog_posts` thuộc category bị xóa sẽ `category_id = 'uncategorized'` trong **cùng 1 transaction** `reassign + soft_delete`. Inspect chỉ preview, không tạo trạng thái blocked chờ Resolve |
| 6 | Audit log | **Có** — bảng `admin_delete_audit` (đưa vào Phase 1) chỉ trace `ai xóa gì lúc nào`, `actor_type user|system` |
| 7 | DB ok nhưng Storage fail | **Có retry nền** — DB coi là success, file đưa vào `storage_cleanup_queue` (tạo từ Phase 4) retry cron |
| 8 | Quyền | **Admin đủ** — `private.is_owner()` cho mọi `delete/Resolve`. RPC destructive chỉ `GRANT TO authenticated`, cron dùng function riêng scope hẹp, không grant `service_role` cho RPC generic |

Retention: **30 ngày** (`app_settings` key `delete.retention_days`), hard delete tay trước retention bị **từ chối** (UI countdown).

---

## 1. Audit hiện trạng (verified 2026-08-31)

### 1.1 Schema & FK
- `profile (uuid)`, `skills/social_links (text id)`, `projects (text id)`, `resume_categories/entries (text id)`, `blog_* (text id)`, `media_assets (bucket,path)`.
- FK cascade: `profile_translations → profile`, `skill_translations → skills`, `project_translations/project_media → projects`, `resume_entry_translations/resume_media → resume_entries`, `resume_entries → resume_categories` **ON DELETE CASCADE** (nguy hiểm), `blog_posts.category_id → blog_categories` **ON DELETE RESTRICT** (an toàn), `blog_post_translations/tags → blog_posts` CASCADE.
- `blog_media` bucket public, `resume-media` private, `project-media/portfolio` public.

### 1.2 RPC hiện tại (hard delete, SECURITY INVOKER, owner RLS)
```
cms_delete_skill/social/profile/project/resume_category/resume_entry/blog_category/blog_tag/blog_post
  → DELETE FROM table WHERE id = p_id (void, throw nếu RLS fail hoặc FK restrict)
```
- `cms_delete_blog_category/tag` có guard `IF EXISTS (posts/tags) THEN RAISE EXCEPTION`.
- `media-actions.deleteMedia`: `findMediaReferences` chỉ check `project_media.src` và `resume_media.(thumbnail/full)_src` — **không check** `blog_posts.cover_bucket_path` và `blog_post_translations.content_md`.
- UI: mọi nút Delete dùng `window.confirm`/`confirm` hard-coded, không i18n, không focus-trap, không preview dependency, không bulk.

### 1.3 Thiếu
- Không `deleted_at`, không trash/restore, không audit, không bulk contract, không inspect/dry-run, không `DeleteResult` có cấu trúc, storage không có queue retry.

---

## 2. Mục tiêu / Không mục tiêu

**Mục tiêu:**
- Thay `confirm` bằng `DeleteDialog` accessible, i18n `en/vi`, blast radius preview.
- Soft delete + Trash (restore, hard delete có guard retention) + audit từ Phase 1.
- Bulk partial `{ deleted[], blocked[], failed[] }` với subtransaction đúng PG semantics + idempotency.
- Inspect/dry-run, Resolve chính xác (parser, FOR UPDATE, version check), storage queue idempotent.

**Không mục tiêu:**
- Thay đổi RLS model (vẫn `private.is_owner()`).
- Không thay đổi publish gate / draft logic.
- Không hàm động `delete_anything(table_name)`.

---

## 3. Kiến trúc

### 3.1 Nguyên tắc
- **Delete Engine** chung + **Policy per entity** (`SkillDeletePolicy`, `BlogCategoryDeletePolicy` ...).
- **SECURITY INVOKER** giữ nguyên — RLS là authority.
- **Soft delete là default** — `cms_soft_delete_*` set `deleted_at = now()`. `cms_hard_delete_*` chỉ khi `deleted_at IS NOT NULL` và `deleted_at + retention <= now()`.
- Public repository adapter + admin active lists filter `WHERE deleted_at IS NULL` (Phase 1 migrate toàn bộ read path cùng lúc). Trash query riêng `WHERE deleted_at IS NOT NULL`.
- **Alias `cms_delete_*` cũ:** từ Phase 1 trở đi **delegate sang soft-delete** hoặc **revoke** — không tồn tại runtime dual hard/soft. Invariant: không có authenticated path nào hard-delete active row.

### 3.2 DB thay đổi

**a) Thêm `deleted_at` cho mọi deletable table (bao gồm profile):**
```sql
alter table profile add column deleted_at timestamptz;
alter table skills add column deleted_at timestamptz;
alter table social_links add column deleted_at timestamptz;
alter table projects add column deleted_at timestamptz;
alter table resume_categories add column deleted_at timestamptz;
alter table resume_entries add column deleted_at timestamptz;
alter table blog_categories add column deleted_at timestamptz;
alter table blog_tags add column deleted_at timestamptz;
alter table blog_posts add column deleted_at timestamptz;
alter table media_assets add column deleted_at timestamptz;

create index skills_active_idx on skills (id) where deleted_at is null;
-- tương tự cho mọi bảng + index cho blog_posts(category_id) where deleted_at is null
```

**b) `uncategorized` protected category (Phase 1):**
```sql
insert into blog_categories (id, slug, sort_order) values ('uncategorized','uncategorized', 999)
on conflict (id) do nothing;
insert into blog_category_translations values ('uncategorized','en','Uncategorized'), ('uncategorized','vi','Chưa phân loại')
on conflict do nothing;
-- DB guard: RPC IF p_id = 'uncategorized' THEN RAISE EXCEPTION ... (code DELETE_PROTECTED)
-- UI: không render Delete cho id này; hard_delete_expired() EXCLUDE id này
```

**c) Audit (Phase 1, không chờ Phase 5):**
```sql
create table admin_delete_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, -- nullable cho system cron
  actor_type text not null check (actor_type in ('user','system')),
  entity_type text not null check (entity_type in ('profile','skill','social','project','resume_category','resume_entry','blog_category','blog_tag','blog_post','media_asset')),
  entity_id text not null,
  entity_label text,
  operation text not null check (operation in ('soft_delete','restore','hard_delete','reassign')),
  dependency_count integer not null default 0,
  resolution_type text, -- 'set_null' | 'remove_node' | 'reassign_uncategorized' | null
  snapshot jsonb, -- schema cố định { slug, titleEn, categoryId } tối thiểu, không lưu full row
  created_at timestamptz not null default now(),
  check ((actor_type='user' and actor_id is not null) or (actor_type='system' and actor_id is null))
);
alter table admin_delete_audit enable row level security;
create policy "audit owner all" on admin_delete_audit for all to authenticated using (private.is_owner()) with check (private.is_owner());
-- cron/system writes via dedicated function SECURITY DEFINER scope hẹp, không grant generic audit insert cho anon
```

**d) Storage cleanup queue (Phase 4, không chờ Phase 6):**
```sql
create table storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  next_retry_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','done','dead')),
  unique (bucket, path) -- idempotent enqueue, chỉ 1 active job
);
-- worker claim: SELECT ... FOR UPDATE SKIP LOCKED WHERE status='pending' AND next_retry_at <= now()
-- exponential backoff: next_retry_at = now() + (2 ^ attempts) * interval '5 minutes'
-- dead-letter sau 5 attempts
```

**e) App settings:**
```sql
insert into app_settings (key, value) values ('delete.retention_days', '30') on conflict do nothing;
```

### 3.3 RPC contract mới

**Error code chuẩn:**
```ts
type DeleteErrorCode =
  | "DELETE_NOT_FOUND"
  | "DELETE_DEPENDENCY_EXISTS"
  | "DELETE_PROTECTED" // uncategorized
  | "DELETE_ALREADY_DELETED"
  | "DELETE_NOT_ALLOWED" // RLS
  | "DELETE_NOT_YET_ELIGIBLE"; // hard delete trước retention

type DeleteResult = {
  status: "deleted" | "blocked" | "failed";
  entity: string;
  id: string;
  dependencies?: Array<{ entity: string; id: string; field: string; count: number }>;
  errorCode?: DeleteErrorCode;
  errorMessage?: string; // i18n key
}
```

**RPCs (SECURITY INVOKER, SET search_path='', GRANT TO authenticated only — cron dùng function riêng):**
- `cms_inspect_delete(entity text, ids text[]) returns jsonb` — dry-run, không mutate, `dependencies` phân loại `cascade | nullable-reference | blocking | embedded | storage`. Blog category preview `reassign_uncategorized` count.
- `cms_soft_delete_skill/social/profile/project/resume_entry/blog_post/media_asset(p_id text) returns DeleteResult` — `UPDATE ... SET deleted_at=now() WHERE id=p_id AND deleted_at IS NULL RETURNING`, insert audit `actor_type='user', actor_id=auth.uid()`.
- `cms_soft_delete_blog_category(p_id text) returns DeleteResult` — **luôn** 1 transaction: `SELECT ... FOR UPDATE` category + posts, `UPDATE blog_posts SET category_id='uncategorized' WHERE category_id=p_id`, `UPDATE blog_categories SET deleted_at=now()`, audit `reassign_uncategorized`. Không có trạng thái blocked chờ Resolve; inspect chỉ preview.
- `cms_soft_delete_blog_tag(p_id text)` — giữ **blocking** nếu `blog_post_tags` còn reference (`DELETE_DEPENDENCY_EXISTS`), không tự cascade.
- `cms_soft_delete_resume_category(p_id text)` — **blocking** nếu còn `resume_entries` active (`DELETE_DEPENDENCY_EXISTS`). Không reassign (resume không có uncategorized).
- `cms_restore_entity(entity text, id text) returns DeleteResult` — `deleted_at = null`, check không conflict slug, cấm restore child vào parent trashed (vd `resume_entries.category_id` parent `deleted_at IS NOT NULL` → fail).
- `cms_hard_delete_entity(entity text, id text) returns DeleteResult` — chỉ khi `deleted_at IS NOT NULL` và `deleted_at + retention <= now()`, xóa row + translations + enqueue storage cleanup. Cron `hard_delete_expired()` re-check dependencies ngay trước DELETE và `FOR UPDATE`.
- `cms_delete_media(bucket text, path text) returns DeleteResult` — mở rộng `findMediaReferences` (cover exact + markdown candidate), nếu `references>0` → `blocked` `DELETE_DEPENDENCY_EXISTS`.
- `cms_resolve_media_reference(bucket text, path text, resolve_type text)` — `SET NULL` cover hoặc `remove_node` markdown (parser), `FOR UPDATE` + version/hash check, audit.

**Bulk:**
- Không `server-side loop COMMIT per id` trong 1 function (PG không cho). Chọn: PL/pgSQL `BEGIN ... EXCEPTION WHEN ...` subtransaction per id, hoặc orchestrator app gọi `cms_soft_delete_*` tuần tự per id với `operation_id` idempotency. Mỗi item trả `DeleteResult` riêng, exception item #9 không abort 8 item trước. `operation_id uuid` để retry an toàn.

**Legacy alias:**
```sql
-- Phase 1 migration
create or replace function cms_delete_project(p_id text) returns DeleteResult as $$
  select cms_soft_delete_project(p_id);
$$ language sql security invoker set search_path='';
-- hoặc revoke nếu muốn bắt buộc migrate UI ngay
```

### 3.4 Media reference & Resolver (Phase 2 & 4)

**Candidate search (Phase 2 inspect):**
- `project_media.src ilike %path%` (LIKE escape)
- `resume_media.thumbnail_src/full_src ilike %path%`
- `blog_posts.cover_bucket_path = path` (exact)
- `blog_post_translations.content_md ilike %path%` — chỉ để tìm **candidate**, có false positive (`foo/a.png` vs `archive/foo/a.png`).

**Authoritative parsing (Phase 4 mutate):**
- Candidate → parser xác thực exact image node:
  - Markdown: parse AST (unified/remark) tìm `image` node `url === path`, remove node → serialize.
  - HTML `<img src="path">` trong markdown: parse HTML node `src === path`, remove node.
- **Cấm** `replace(path,"")` generic và regex mutation làm canonical. `ILIKE` chỉ cho candidate.

### 3.5 TOCTOU & Concurrency
- Mọi Resolve transaction `SELECT ... FOR UPDATE` những rows sẽ mutate (posts, translations, media) **trước** khi clear/rewrite.
- Rich-text update có `version/hash` check: `UPDATE ... WHERE id=p_id AND updated_at = p_expected_updated_at` (optimistic concurrency). Nếu mismatch → abort `failed` để user re-inspect.

### 3.6 Lifecycle & FK invariant (resume CASCADE)
- Cấm `create/reassign/restore` child vào parent `deleted_at IS NOT NULL`:
  - `cms_upsert_resume_entry` check `resume_categories.deleted_at IS NULL` cho `category_id`.
  - `cms_restore_*` check parent trashed → fail.
- `hard_delete_expired()` re-check `resume_entries` còn active trước khi `DELETE FROM resume_categories`.

### 3.7 UI/UX

**DeleteDialog (`src/components/ui/delete-dialog.tsx`):**
- `role="alertdialog"`, focus trap (Radix/ark), ESC close, restore focus, `aria-describedby`.
- i18n `admin.delete.*` (en/vi), theme destructive tokens.
- Variant `warning` (soft delete) vs `critical` (hard delete).
- Preview dependency từ inspect: `This will: move 3 posts to Uncategorized.`

**Bulk & Partial:**
- Checkbox + `Delete 8 selected` → inspect → `8 will be moved to Trash, 2 blocked` → confirm → banner `8 moved to Trash. 2 blocked [View details]`.

**Trash (`/admin/trash`):**
- Phase 1: **minimal Trash/Restore** — list `deleted_at`, `Restore` per row (không chờ Phase 5) để không có gap "xóa nhưng không restore được".
- Phase 5: full Trash/Audit UI — tabs entity, `Hard delete` per row (chỉ khi `eligible` — countdown `Permanent deletion in N days`), `Empty trash` chỉ xử lý records `eligible`, typed confirmation `DELETE` / `DELETE 3`, audit timeline.

**Hard delete guard:**
```sql
if deleted_at + (select value::int from app_settings where key='delete.retention_days') * interval '1 day' > now()
then return DELETE_NOT_YET_ELIGIBLE;
```

---

## 4. Phân phase (mỗi phase = 1 issue, 1 branch, 1 PR)

### Phase 1 — Delete Foundation (bắt buộc đầy đủ, không deploy thiếu)
- **DB:** `deleted_at` (bao gồm `profile`) + partial index `where deleted_at is null` + `uncategorized` seed + `app_settings` retention + `admin_delete_audit` (actor_type) + `FOR UPDATE` index.
- **Read path:** migrate **toàn bộ** `WHERE deleted_at IS NULL` — `src/features/cms/repository.ts`, `src/features/blog/repository.ts`, admin list queries, counters, sitemap/query helpers. Trash query riêng.
- **RPC:** `cms_inspect_delete` (dry-run) + `cms_soft_delete_*` + `cms_restore_entity` (minimal) + `cms_hard_delete_entity` (với retention guard) + alias `cms_delete_* → soft_delete` + `cms_upsert_*` guard parent not trashed. `GRANT TO authenticated` only.
- **Lib:** `src/features/cms/delete/*` types, `delete-entity.ts` helper `auth→validate→rpc→map→revalidate+hardening`, audit writer.
- **UI:** `DeleteDialog` + migrate **1 nút thí điểm** (`DeleteProjectButton`) sang Dialog + soft delete + minimal `/admin/trash` (list + Restore). Các nút còn lại vẫn hiển thị nhưng đã qua alias soft-delete.
- **Accept:** `window.confirm` không còn ở project path, trashed row biến mất khỏi public/admin active views nhưng đọc được từ Trash query (test chứng minh), alias không hard-delete active row, audit row được tạo từ Phase 1, local-first RLS test 4 role.
- **Rollback:** `deleted_at` nullable an toàn.

### Phase 2 — Dependency Inspection / Dry Run
- **DB:** không migration mới (dùng Phase 1 schema).
- **Logic:** mở rộng `findMediaReferences` (thêm blog cover exact + markdown candidate), `cms_inspect_delete` trả `dependencies` chi tiết với `reassign_uncategorized` preview.
- **UI:** mọi Delete button gọi inspect trước khi confirm, hiển thị dependency count. Không mutate.
- **Accept:** inspect không mutate, deterministic, candidate markdown không false-positive thành mutation.

### Phase 3 — Bulk Delete + Partial Result
- **RPC/orchestrator:** `cms_bulk_soft_delete` với subtransaction per id **hoặc** orchestrator tuần tự + `operation_id` idempotency, trả `{ requested, deleted[], blocked[], failed[] }`.
- **UI:** bulk checkbox ở `/admin/blog`, `/admin/projects`, `/admin/media`; không `Promise.all` từ client.
- **Accept:** `10 → 8 deleted + 2 blocked` đúng, retry cùng `operation_id` không duplicate.

### Phase 4 — Dependency Resolution (Resolve & Delete) + Storage Queue
- **DB:** `storage_cleanup_queue` migration (unique, attempts, backoff, status) — **không chờ Phase 6**.
- **RPC:** `cms_resolve_and_soft_delete` transaction `FOR UPDATE + version check + SET NULL / remove_node (parser) + reassign + soft_delete + audit`, `cms_resolve_media_reference`.
- **Storage:** enqueue khi `storage.remove` fail, DB success không rollback.
- **UI:** `Resolve & Delete` (không "Force"), preview `Resolving will: ...`.
- **Accept:** category → uncategorized, cover null, markdown node removed chính xác, storage enqueue idempotent.

### Phase 5 — Audit + Full Trash UI
- **DB:** không table mới (audit đã ở Phase 1).
- **UI:** full `/admin/trash` tabs, `Hard delete` guard retention + typed confirmation, `Empty trash` eligible only, `/admin/audit` timeline với filter entity/actor, `uncategorized` multi-layer guard (seed idempotent + RPC DELETE_PROTECTED + UI ẩn).
- **Accept:** mọi delete có audit row, anon không đọc audit, `uncategorized` không xóa được ở mọi lớp.

### Phase 6 — Retention & Cleanup Worker + Hardening
- **DB/cron:** `hard_delete_expired()` (cron daily, `FOR UPDATE SKIP LOCKED`, re-check resume FK) + `retry_storage_cleanup()` (exponential backoff, `SKIP LOCKED`, dead-letter sau 5). Function riêng `SECURITY DEFINER` scope hẹp cho cron, không reuse generic hard delete.
- **UI/hardening:** typed confirmation `DELETE <id>` cho permanent delete eligible/batch lớn, rate limit configurable (không chặn bulk core), operation_id hardening.
- **Accept:** trashed >30d tự hard delete, storage queue retry thành công, không lộ secret.

---

## 5. Local-first workflow mỗi phase
1. `supabase migration new <phase>` → apply `--local` → `supabase db reset` → seed fixture (cover, embedded md, FK, missing storage, trashed parent).
2. RPC/RLS tests trong `supabase/tests/<phase>_test.sql` (4 role: anon/auth non-owner/owner/service_role — service_role không được gọi RPC destructive generic).
3. App integration: `npm run lint && npm run typecheck && npm run build -- --webpack`.
4. Manual smoke: keyboard (Tab/ESC/focus restore), mobile/desktop, light/dark, en/vi.
5. Sau local pass → `supabase db query --linked -f ...` (human-approved) → mirror `prod → local`.

---

## 6. Rủi ro & mitigation (cập nhật)
- **Resume CASCADE:** guard ở `upsert/restore/hard_delete_expired` + `FOR UPDATE`, không chỉ guard lúc soft-delete.
- **Markdown:** parser authoritative, `ILIKE` chỉ candidate, cấm `replace` generic.
- **TOCTOU:** `FOR UPDATE` + optimistic concurrency `updated_at`.
- **Storage 2-phase:** queue idempotent, retry không rollback DB.
- **`uncategorized`:** multi-layer guard + cron exclude.
- **Restore gap:** solved bởi minimal Trash/Restore ở Phase 1.

---

## 7. File impact dự kiến
- `supabase/migrations/*_advanced_delete*.sql` (Phase 1,4,6)
- `supabase/tests/*_delete*.sql`
- `src/features/cms/delete/*` (new)
- `src/features/cms/media.ts` (mở rộng reference check)
- `src/features/cms/repository.ts`, `src/features/blog/repository.ts` (filter deleted_at)
- `src/components/ui/delete-dialog.tsx` (new)
- `src/app/admin/(dashboard)/*/delete-*.tsx` (migrate từng nút)
- `src/app/admin/(dashboard)/trash/*` (new Phase1 minimal → Phase5 full)
- `messages/en.json`, `messages/vi.json` (i18n delete keys)

---

## 8. Next steps
1. Gửi plan v3 cho ChatGPT vòng 3 lấy `approve`.
2. Tách issues Phase 1→6 theo chain: P1 (Foundation + deleted_at + read filters + audit + minimal Restore) → P2 Inspect → P3 Bulk → P4 Resolve+queue → P5 Full Trash/Audit → P6 Retention worker.
3. Bắt đầu Phase 1 branch `feat/<issue>-delete-foundation` từ `main`.

