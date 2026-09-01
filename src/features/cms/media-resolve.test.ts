import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { removeResumeMediaReference } from "./media-resolve";

test("removeResumeMediaReference deletes resume_media row", async () => {
  let observedFilter: unknown = null;
  const mockClient = {
    from: (table: string) => {
      assert.equal(table, "resume_media");
      return {
        delete: () => ({
          or: (filter: string) => {
            observedFilter = filter;
            return {
              select: async (cols: string) => {
                assert.equal(cols, "id");
                return { data: [{ id: "test-id" }], error: null };
              },
            };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;

  const result = await removeResumeMediaReference(mockClient as unknown as SupabaseClient, "a.jpg");
  assert.equal(result.deletedRows, 1);
  assert.ok(
    typeof observedFilter === "string" && (observedFilter as string).includes("thumbnail_src.eq.a.jpg"),
    `filter should contain thumbnail_src.eq.a.jpg: ${String(observedFilter)}`,
  );
  assert.ok(
    typeof observedFilter === "string" && (observedFilter as string).includes("full_src.eq.a.jpg"),
    `filter should contain full_src.eq.a.jpg: ${String(observedFilter)}`,
  );
});

test("removeResumeMediaReference throws on error", async () => {
  const mockClient = {
    from: () => ({
      delete: () => ({
        or: () => ({
          select: async () => ({ data: null, error: { message: "db error" } }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  await assert.rejects(
    () => removeResumeMediaReference(mockClient as unknown as SupabaseClient, "a.jpg"),
    /db error/,
  );
});

test("removeResumeMediaReference returns 0 when no rows", async () => {
  const mockClient = {
    from: () => ({
      delete: () => ({
        or: () => ({
          select: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  const result = await removeResumeMediaReference(mockClient as unknown as SupabaseClient, "missing.jpg");
  assert.equal(result.deletedRows, 0);
});
