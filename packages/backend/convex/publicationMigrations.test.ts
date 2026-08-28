import { describe, expect, test } from "bun:test";
import { internal } from "./_generated/api";
import { runBatch } from "./publicationMigrations";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

type Row = Record<string, unknown> & { _id: string };

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

function makeContext(tables: Record<string, Row[]>) {
  const scheduled: Array<{
    functionReference: unknown;
    args: Record<string, unknown>;
  }> = [];
  let nextId = 1;

  const findRows = (table: string, constraints: Array<[string, unknown]>) =>
    (tables[table] ?? []).filter((row) =>
      constraints.every(([field, value]) => row[field] === value),
    );

  const query = (table: string, constraints: Array<[string, unknown]> = []) => {
    const rows = () => findRows(table, constraints);
    const builder = {
      unique: async () => {
        const matches = rows();
        if (matches.length > 1) throw new Error("expected unique");
        return matches[0] ?? null;
      },
      paginate: async ({
        cursor,
        numItems,
      }: {
        cursor: string | null;
        numItems: number;
      }) => {
        const offset = cursor ? Number(cursor) : 0;
        const page = rows().slice(offset, offset + numItems);
        return {
          page,
          isDone: offset + page.length >= rows().length,
          continueCursor: String(offset + page.length),
        };
      },
    };
    return {
      ...builder,
      withIndex: (
        _indexName: string,
        resolve: (q: {
          eq: (field: string, value: unknown) => unknown;
        }) => unknown,
      ) => {
        const indexConstraints: Array<[string, unknown]> = [];
        const q = {
          eq: (field: string, value: unknown) => {
            indexConstraints.push([field, value]);
            return q;
          },
        };
        resolve(q);
        return query(table, indexConstraints);
      },
    };
  };

  const db = {
    get: async (id: string) => {
      for (const rows of Object.values(tables)) {
        const row = rows.find((candidate) => candidate._id === id);
        if (row) return row;
      }
      return null;
    },
    insert: async (table: string, value: Record<string, unknown>) => {
      const id = `${table}-${nextId++}`;
      const rows = tables[table] ?? [];
      rows.push({ ...value, _id: id });
      tables[table] = rows;
      return id;
    },
    patch: async (id: string, value: Record<string, unknown>) => {
      for (const rows of Object.values(tables)) {
        const row = rows.find((candidate) => candidate._id === id);
        if (row) Object.assign(row, value);
      }
    },
    query,
    normalizeId: (table: string, id: string) =>
      (tables[table] ?? []).some((row) => row._id === id) ? id : null,
  };

  const ctx = {
    db,
    scheduler: {
      runAfter: async (
        _delay: number,
        functionReference: unknown,
        args: Record<string, unknown>,
      ) => {
        scheduled.push({ functionReference, args });
      },
    },
  };
  return { ctx, scheduled, tables };
}

function migrationFixture() {
  return makeContext({
    sites: [
      {
        _id: "site-1",
        liveReleaseId: "release-1",
        organizationId: "organization-1",
      },
    ],
    siteReleases: [{ _id: "release-1", siteId: "site-1", number: 1 }],
    contentRevisions: [
      {
        _id: "revision-1",
        siteId: "site-1",
        payloadId: "payload-1",
        fileIds: [],
        libraryIds: [],
        pageIds: ["page-1"],
      },
    ],
    contentPayloads: [
      {
        _id: "payload-1",
        siteId: "site-1",
        content: JSON.stringify({
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              attrs: { "openeditor-id": "paragraph-1" },
              content: [{ type: "text", text: "Migrated body" }],
            },
          ],
        }),
      },
    ],
    releasePages: [
      {
        _id: "release-page-1",
        releaseId: "release-1",
        siteId: "site-1",
        pageId: "page-1",
        contentRevisionId: "revision-1",
        descriptionText: "Legacy description",
      },
    ],
    releaseFiles: [
      {
        _id: "release-file-1",
        releaseId: "release-1",
        siteId: "site-1",
        fileId: "file-1",
        kind: "file",
        objectKey: "documents/file-1",
        size: 10,
        checksum: "checksum-1",
      },
    ],
    searchEntries: [
      {
        _id: "search-page-1",
        siteId: "site-1",
        scopeId: "release:release-1",
        kind: "page",
        sourceId: "page-1",
        title: "Home",
        text: "Migrated body",
      },
      {
        _id: "search-file-1",
        siteId: "site-1",
        scopeId: "release:release-1",
        kind: "file",
        sourceId: "file-1",
        title: "guide.md",
        text: "Historical file text",
      },
    ],
  });
}

async function drainMigration(
  state: ReturnType<typeof migrationFixture>,
  args: { runId: string; mode: "dryRun" | "apply" },
) {
  await invoke(runBatch, state.ctx, args);
  while (true) {
    const index = state.scheduled.findIndex(
      (item) => item.args.runId === args.runId,
    );
    if (index === -1) return;
    const [next] = state.scheduled.splice(index, 1);
    if (next) await invoke(runBatch, state.ctx, next.args);
  }
}

describe("publication migration", () => {
  test("backfills immutable text, release metadata, search identity, and live projection", async () => {
    const state = migrationFixture();

    await drainMigration(state, { runId: "apply-1", mode: "apply" });

    expect(state.tables.contentRevisions?.[0]?.searchText).toContain(
      "Migrated body",
    );
    expect(state.tables.releasePages?.[0]?.description).toContain(
      "Migrated body",
    );
    expect(state.tables.releaseFiles?.[0]?.extractedText).toBe(
      "Historical file text",
    );
    expect(state.tables.searchEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: "search-page-1",
          releaseId: "release-1",
        }),
        expect.objectContaining({
          _id: "search-file-1",
          releaseId: "release-1",
        }),
      ]),
    );
    expect(state.tables.sites?.[0]?.liveSearchProjectionGeneration).toBe(1);
    expect(state.tables.publicationMigrationRuns?.[0]).toMatchObject({
      status: "completed",
      migratedCount: 6,
      scheduledCount: 1,
      skippedCount: 0,
      errorCount: 0,
    });
    expect(state.scheduled).toContainEqual({
      functionReference: internal.publication.projectLiveSearch,
      args: {
        siteId: "site-1",
        expectedLiveReleaseId: "release-1",
        expectedLiveSearchProjectionGeneration: 1,
      },
    });
  });

  test("dry run reports work without changing publication data", async () => {
    const state = migrationFixture();

    await drainMigration(state, { runId: "dry-1", mode: "dryRun" });

    expect(state.tables.contentRevisions?.[0]?.searchText).toBeUndefined();
    expect(state.tables.releasePages?.[0]?.description).toBeUndefined();
    expect(state.tables.releaseFiles?.[0]?.extractedText).toBeUndefined();
    expect(state.tables.searchEntries?.[0]?.releaseId).toBeUndefined();
    expect(
      state.tables.sites?.[0]?.liveSearchProjectionGeneration,
    ).toBeUndefined();
    expect(state.tables.publicationMigrationRuns?.[0]).toMatchObject({
      status: "completed",
      migratedCount: 6,
      scheduledCount: 1,
      skippedCount: 0,
      errorCount: 0,
    });
    expect(
      state.scheduled.some(
        (item) =>
          item.functionReference === internal.publication.projectLiveSearch,
      ),
    ).toBe(false);
  });

  test("persists a failure for malformed historical content", async () => {
    const state = migrationFixture();
    const payload = state.tables.contentPayloads?.[0];
    if (payload) payload.content = "not-json";

    await drainMigration(state, { runId: "bad-1", mode: "apply" });

    expect(state.tables.publicationMigrationRuns?.[0]).toMatchObject({
      status: "failed",
      errorCount: 1,
      failureSummary: expect.stringContaining("Unexpected"),
    });
    expect(state.scheduled).toEqual([]);
  });
});
