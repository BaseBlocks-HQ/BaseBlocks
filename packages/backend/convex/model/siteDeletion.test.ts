import { describe, expect, test } from "bun:test";
import { deleteSiteData } from "./siteDeletion";

function deletionContext({
  activeDraftRestoreId,
  rows = {},
}: {
  activeDraftRestoreId?: string;
  rows?: Record<string, Array<{ _id: string }>>;
}) {
  const deleted: string[] = [];
  const site = {
    _id: "site-1",
    organizationId: "organization-1",
    activeDraftRestoreId,
  };
  const db = {
    delete: async (id: string) => {
      deleted.push(id);
    },
    get: async (id: string) => (id === site._id ? site : null),
    insert: async () => "inserted",
    patch: async () => {},
    query: (table: string) => ({
      withIndex: () => ({
        collect: async () => rows[table] ?? [],
        first: async () => null,
        unique: async () => null,
      }),
    }),
  };
  return { ctx: { db } as never, deleted };
}

describe("site deletion", () => {
  test("rejects deletion while a draft restore owns the site", async () => {
    const { ctx, deleted } = deletionContext({
      activeDraftRestoreId: "restore-active",
    });

    await expect(
      deleteSiteData(ctx, "site-1" as never, { includeDomains: true }),
    ).rejects.toThrow("currently being restored");
    expect(deleted).toEqual([]);
  });

  test("deletes terminal draft restore records with the site", async () => {
    const { ctx, deleted } = deletionContext({
      rows: { draftRestores: [{ _id: "restore-complete" }] },
    });

    await deleteSiteData(ctx, "site-1" as never, { includeDomains: true });

    expect(deleted).toContain("restore-complete");
    expect(deleted.at(-1)).toBe("site-1");
  });
});
