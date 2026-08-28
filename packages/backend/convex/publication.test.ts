import { describe, expect, test } from "bun:test";
import {
  getDraftReferencedFileIds,
  projectLiveSearch,
  projectLiveSearchBatch,
  snapshotFiles,
  truncateDescription,
} from "./publication";
import { buildReleaseChangeDetail } from "./model/releaseChangeDetails";
import { publish } from "./releases";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

type Row = Record<string, unknown> & { _id: string };

/**
 * Minimal in-memory Convex db covering the access patterns the publish
 * transaction uses: point reads/writes and indexed queries consumed
 * through unique/first/collect/async-iteration.
 */
function makeDb(tables: Record<string, Row[]>) {
  const inserted: Array<{ table: string; value: Record<string, unknown> }> = [];
  const patches: Array<[string, Record<string, unknown>]> = [];
  const deletes: string[] = [];
  let nextId = 1;
  const idFor = (row: Row) => row._id;
  const results = (table: string, filter: (row: Row) => boolean) => {
    const rows = () => (tables[table] ?? []).filter(filter);
    const builder = {
      unique: async () => {
        const all = rows();
        if (all.length > 1) throw new Error("expected unique");
        return all[0] ?? null;
      },
      first: async () => rows()[0] ?? null,
      collect: async () => rows(),
      order: () => builder,
      paginate: async () => ({
        page: rows(),
        isDone: true,
        continueCursor: "",
      }),
      [Symbol.asyncIterator]: async function* () {
        for (const row of rows()) yield row;
      },
    };
    return builder;
  };
  return {
    inserted,
    patches,
    deletes,
    db: {
      get: async (id: string) => {
        for (const rows of Object.values(tables)) {
          const row = rows.find((candidate) => candidate._id === id);
          if (row) return row;
        }
        return null;
      },
      insert: async (table: string, value: Record<string, unknown>) => {
        const id = `${table}:${nextId++}`;
        const rows = tables[table] ?? [];
        rows.push({ ...value, _id: id } as Row);
        tables[table] = rows;
        inserted.push({ table, value });
        return id;
      },
      patch: async (id: string, value: Record<string, unknown>) => {
        for (const rows of Object.values(tables)) {
          const row = rows.find((candidate) => candidate._id === id);
          if (row) Object.assign(row, value);
        }
        patches.push([id, value]);
      },
      replace: async (id: string, value: Record<string, unknown>) => {
        for (const rows of Object.values(tables)) {
          const row = rows.find((candidate) => candidate._id === id);
          if (row) {
            for (const key of Object.keys(row)) delete row[key];
            Object.assign(row, { ...value, _id: id });
          }
        }
      },
      delete: async (id: string) => {
        for (const [table, rows] of Object.entries(tables)) {
          const index = rows.findIndex((candidate) => candidate._id === id);
          if (index >= 0) {
            rows.splice(index, 1);
            deletes.push(table);
          }
        }
      },
      query: (table: string) => ({
        withIndex: (
          _indexName: string,
          resolve: (q: {
            eq: (field: string, value: unknown) => unknown;
          }) => unknown,
        ) => {
          const constraints: Array<[string, unknown]> = [];
          const q = {
            eq: (field: string, value: unknown) => {
              constraints.push([field, value]);
              return q;
            },
          };
          resolve(q);
          return results(table, (row) =>
            constraints.every(([field, value]) => row[field] === value),
          );
        },
      }),
      normalizeId: (table: string, id: string) =>
        (tables[table] ?? []).some((row) => row._id === id) ? id : null,
    },
    idFor,
    results,
    tables,
  };
}

function memberCtx(db: unknown, userId: string) {
  return {
    auth: { getUserIdentity: async () => ({ subject: userId }) },
    runQuery: async () => ({
      _id: "member-1",
      organizationId: "organization-1",
      role: "owner",
      userId,
    }),
    scheduler: {
      runAfter: async () => null,
    },
    db,
  };
}

async function runLiveSearchProjection(
  state: ReturnType<typeof makeDb>,
  args: Record<string, unknown>,
) {
  const scheduled: Array<Record<string, unknown>> = [];
  const ctx = {
    db: state.db,
    scheduler: {
      runAfter: async (
        _delay: number,
        _fn: unknown,
        nextArgs: Record<string, unknown>,
      ) => {
        scheduled.push(nextArgs);
      },
    },
  };
  await invoke(projectLiveSearch, ctx, args);
  while (scheduled.length > 0) {
    const nextArgs = scheduled.shift();
    if (nextArgs) await invoke(projectLiveSearchBatch, ctx, nextArgs);
  }
}

describe("publish", () => {
  test("re-promotes the base release when the draft has no pending changes", async () => {
    const site: Row = {
      _id: "site-1",
      organizationId: "organization-1",
      draftRevision: 3,
      liveReleaseId: "release-old",
      draftBaseReleaseId: "release-base",
    };
    const baseRelease: Row = {
      _id: "release-base",
      siteId: "site-1",
      number: 2,
    };
    const state = makeDb({
      sites: [site],
      siteReleases: [baseRelease],
      draftChanges: [],
    });
    let scheduled: unknown;
    const ctx = {
      ...memberCtx(state.db, "user-1"),
      scheduler: {
        runAfter: async (
          _delay: number,
          fn: unknown,
          args: Record<string, unknown>,
        ) => {
          scheduled = { fn, args };
        },
      },
    };
    expect(
      await invoke(publish, ctx, {
        siteId: site._id,
        expectedDraftRevision: 3,
      }),
    ).toEqual({ releaseId: "release-base", number: 2, reused: true });
    expect(site.liveReleaseId).toBe("release-base");
    expect(scheduled).toMatchObject({
      args: { siteId: "site-1", expectedLiveReleaseId: "release-base" },
    });
  });

  test("rejects publishing when the draft is already live", async () => {
    const site: Row = {
      _id: "site-1",
      organizationId: "organization-1",
      draftRevision: 3,
      liveReleaseId: "release-base",
      draftBaseReleaseId: "release-base",
    };
    const state = makeDb({
      sites: [site],
      siteReleases: [{ _id: "release-base", siteId: "site-1", number: 2 }],
      draftChanges: [],
    });
    await expect(
      invoke(publish, memberCtx(state.db, "user-1"), {
        siteId: site._id,
        expectedDraftRevision: 3,
      }),
    ).rejects.toThrow("already live");
  });

  test("builds the manifest, activates, and clears draft changes atomically", async () => {
    const page: Row = {
      _id: "page-1",
      siteId: "site-1",
      parentId: undefined,
      title: "Home",
      slug: "home",
      icon: undefined,
      order: 0,
      updatedAt: 10,
      deletedAt: undefined,
    };
    const document: Row = {
      _id: "document-1",
      siteId: "site-1",
      pageId: "page-1",
      revisionId: "revision-1",
      contentHash: "hash-1",
      updatedAt: 12,
    };
    const revision: Row = {
      _id: "revision-1",
      siteId: "site-1",
      payloadId: "payload-1",
      fileIds: [],
      searchText: "Hello world",
    };
    const change: Row = {
      _id: "change-1",
      siteId: "site-1",
      entityType: "page",
      entityId: "page-1",
      changeType: "updated",
      label: "Home",
      details: ["Content changed"],
      draftRevision: 4,
    };
    const site: Row = {
      _id: "site-1",
      organizationId: "organization-1",
      draftRevision: 4,
      liveReleaseId: undefined,
      draftBaseReleaseId: undefined,
      activeDraftRestoreId: undefined,
      defaultPageId: "page-1",
      nextReleaseNumber: 5,
      name: "Site",
      settings: {},
    };
    const state = makeDb({
      sites: [site],
      pages: [page],
      pageDocuments: [document],
      contentRevisions: [revision],
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
              },
            ],
          }),
        },
      ],
      draftChanges: [change],
    });
    const scheduled: Array<Record<string, unknown>> = [];
    const ctx = {
      ...memberCtx(state.db, "user-1"),
      scheduler: {
        runAfter: async (
          _delay: number,
          fn: unknown,
          args: Record<string, unknown>,
        ) => {
          scheduled.push({ fn, args });
        },
      },
    };
    const result = (await invoke(publish, ctx, {
      siteId: site._id,
      expectedDraftRevision: 4,
    })) as { releaseId: string; number: number; reused: boolean };
    expect(result.reused).toBe(false);
    expect(site.liveReleaseId).toBe(result.releaseId);
    expect(site.draftBaseReleaseId).toBe(result.releaseId);
    expect(site.nextReleaseNumber).toBe(6);

    const releasePages = state.inserted.filter(
      (row) => row.table === "releasePages",
    );
    expect(releasePages).toHaveLength(1);
    expect(releasePages[0]?.value).toMatchObject({
      pageId: "page-1",
      title: "Home",
      description: "Hello world",
    });
    const releaseChanges = state.inserted.filter(
      (row) => row.table === "releaseChanges",
    );
    expect(releaseChanges).toHaveLength(1);
    expect(state.deletes).toContain("draftChanges");
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toMatchObject({
      args: {
        siteId: "site-1",
        expectedLiveReleaseId: result.releaseId,
        expectedLiveSearchProjectionGeneration: 1,
      },
    });
  });

  test("rejects a stale draft revision before touching data", async () => {
    const site: Row = {
      _id: "site-1",
      organizationId: "organization-1",
      draftRevision: 7,
      liveReleaseId: undefined,
      draftBaseReleaseId: undefined,
    };
    const state = makeDb({ sites: [site], draftChanges: [] });
    await expect(
      invoke(publish, memberCtx(state.db, "user-1"), {
        siteId: site._id,
        expectedDraftRevision: 6,
      }),
    ).rejects.toThrow("draft changed while publishing");
    expect(state.inserted).toHaveLength(0);
  });

  test("rejects malformed legacy page content before activation", async () => {
    const site: Row = {
      _id: "site-1",
      organizationId: "organization-1",
      draftRevision: 2,
      liveReleaseId: undefined,
      draftBaseReleaseId: undefined,
      nextReleaseNumber: 1,
      name: "Site",
      settings: {},
    };
    const page: Row = {
      _id: "page-1",
      siteId: site._id,
      title: "Home",
      slug: "home",
      order: 0,
      updatedAt: 1,
    };
    const document: Row = {
      _id: "document-1",
      siteId: site._id,
      pageId: page._id,
      revisionId: "revision-1",
      contentHash: "hash-1",
      updatedAt: 1,
    };
    const revision: Row = {
      _id: "revision-1",
      siteId: site._id,
      payloadId: "payload-1",
    };
    const state = makeDb({
      sites: [site],
      pages: [page],
      pageDocuments: [document],
      contentRevisions: [revision],
      contentPayloads: [
        {
          _id: "payload-1",
          siteId: site._id,
          content: JSON.stringify({
            type: "doc",
            version: 1,
            content: [{ type: "unknownHistoricalNode" }],
          }),
        },
      ],
      draftChanges: [],
    });

    await expect(
      invoke(publish, memberCtx(state.db, "user-1"), {
        siteId: site._id,
        expectedDraftRevision: site.draftRevision,
      }),
    ).rejects.toThrow();
    expect(site.liveReleaseId).toBeUndefined();
  });

  test("rejects publishing a site with no live pages", async () => {
    const site: Row = {
      _id: "site-1",
      organizationId: "organization-1",
      draftRevision: 1,
      liveReleaseId: undefined,
      draftBaseReleaseId: undefined,
      nextReleaseNumber: 1,
      name: "Site",
      settings: {},
    };
    const state = makeDb({ sites: [site], draftChanges: [] });

    await expect(
      invoke(publish, memberCtx(state.db, "user-1"), {
        siteId: site._id,
        expectedDraftRevision: site.draftRevision,
      }),
    ).rejects.toThrow("at least one page");
    expect(site.liveReleaseId).toBeUndefined();
  });
});

describe("live search projection", () => {
  test("uses the text captured by the released file instead of current extraction", async () => {
    const site: Row = {
      _id: "site-1",
      liveReleaseId: "release-1",
    };
    const release: Row = {
      _id: "release-1",
      siteId: site._id,
    };
    const releasedFile: Row = {
      _id: "release-file-1",
      releaseId: release._id,
      fileId: "file-1",
      kind: "file",
      filename: "guide.md",
      extractedText: "released guide text",
    };
    const existingEntry: Row = {
      _id: "search-1",
      siteId: site._id,
      scopeId: "live:site-1",
      kind: "file",
      sourceId: "file-1",
      title: "guide.md",
      text: "draft guide text",
    };
    const state = makeDb({
      sites: [site],
      siteReleases: [release],
      releasePages: [],
      releaseFiles: [releasedFile],
      fileExtractions: [
        {
          _id: "extraction-1",
          fileId: "file-1",
          status: "ready",
          extractedText: "newer draft extraction",
        },
      ],
      searchEntries: [existingEntry],
    });

    await runLiveSearchProjection(state, {
      siteId: site._id,
      expectedLiveReleaseId: release._id,
    });

    expect(state.tables.searchEntries).toContainEqual(
      expect.objectContaining({
        sourceId: "file-1",
        text: "released guide text",
        releaseId: release._id,
      }),
    );
  });

  test("does not leak current extraction into a legacy release", async () => {
    const site: Row = {
      _id: "site-1",
      liveReleaseId: "release-1",
    };
    const release: Row = {
      _id: "release-1",
      siteId: site._id,
    };
    const releasedFile: Row = {
      _id: "release-file-1",
      releaseId: release._id,
      fileId: "file-1",
      kind: "file",
      objectKey: "files/old-guide.md",
      filename: "guide.md",
      size: 10,
      checksum: "old-checksum",
    };
    const existingEntry: Row = {
      _id: "search-1",
      siteId: site._id,
      scopeId: "live:site-1",
      kind: "file",
      sourceId: "file-1",
      title: "guide.md",
      text: "stale text",
    };
    const state = makeDb({
      sites: [site],
      siteReleases: [release],
      releasePages: [],
      releaseFiles: [releasedFile],
      files: [
        {
          _id: "file-1",
          kind: "file",
          objectKey: "files/new-guide.md",
          size: 12,
          checksum: "new-checksum",
        },
      ],
      fileExtractions: [
        {
          _id: "extraction-1",
          fileId: "file-1",
          status: "ready",
          sourceVersion: "files/new-guide.md\u000012\u0000new-checksum",
          extractedText: "current draft extraction",
        },
      ],
      searchEntries: [existingEntry],
    });

    await runLiveSearchProjection(state, {
      siteId: site._id,
      expectedLiveReleaseId: release._id,
    });

    expect(state.tables.searchEntries).toContainEqual(
      expect.objectContaining({
        sourceId: "file-1",
        text: "",
      }),
    );
  });
});

describe("publication helpers", () => {
  test("keeps content diff details when a page is deleted", async () => {
    const site: Row = {
      _id: "site-1",
      draftBaseReleaseId: "release-base",
    };
    const state = makeDb({
      sites: [site],
      pages: [
        {
          _id: "page-1",
          siteId: site._id,
          title: "Removed page",
          slug: "removed",
          order: 0,
          deletedAt: 1,
        },
      ],
      pageDocuments: [
        {
          _id: "document-1",
          siteId: site._id,
          pageId: "page-1",
          revisionId: "revision-1",
          contentHash: "same-content",
        },
      ],
      contentRevisions: [
        {
          _id: "revision-1",
          siteId: site._id,
          payloadId: "payload-1",
          fileIds: [],
          libraryIds: [],
          pageIds: [],
        },
      ],
      contentPayloads: [
        {
          _id: "payload-1",
          siteId: site._id,
          content: JSON.stringify({
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                attrs: { "openeditor-id": "paragraph-1" },
                content: [
                  {
                    type: "text",
                    text: "Before",
                    attrs: { "openeditor-id": "text-1" },
                  },
                ],
              },
            ],
          }),
        },
      ],
      siteReleases: [
        {
          _id: "release-base",
          siteId: site._id,
          number: 1,
        },
      ],
      releasePages: [
        {
          _id: "release-page-1",
          releaseId: "release-base",
          siteId: site._id,
          pageId: "page-1",
          contentRevisionId: "revision-1",
          contentHash: "same-content",
          title: "Removed page",
          slug: "removed",
          order: 0,
        },
      ],
    });

    const detail = await buildReleaseChangeDetail(
      { db: state.db } as never,
      site as never,
      {
        entityType: "page",
        entityId: "page-1",
        changeType: "deleted",
        label: "Removed page",
        details: [],
      },
    );

    expect(detail.content).toEqual({
      beforeLines: ["Before"],
      afterLines: [],
    });
  });

  test("rejects a file without a publishable extraction", async () => {
    const file: Row = {
      _id: "file-1",
      siteId: "site-1",
      kind: "file",
      objectKey: "files/guide.md",
      filename: "guide.md",
      contentType: "text/markdown",
      size: 10,
      checksum: "checksum-1",
      createdAt: 1,
      uploadedBy: "user-1",
    };
    const state = makeDb({ files: [file], fileExtractions: [] });

    await expect(
      snapshotFiles(
        { db: state.db } as never,
        "release-1" as never,
        "site-1" as never,
        { _id: "site-1" as never },
      ),
    ).rejects.toThrow("Document extraction changed");
    expect(
      state.inserted.filter((row) => row.table === "releaseFiles"),
    ).toHaveLength(0);
  });

  test("resolves draft file references with one page-document scan", async () => {
    const page = {
      _id: "page-1",
      siteId: "site-1",
      deletedAt: undefined,
    };
    const document = {
      _id: "document-1",
      siteId: "site-1",
      pageId: page._id,
      revisionId: "revision-1",
    };
    const revision = {
      _id: "revision-1",
      siteId: "site-1",
      fileIds: ["file-1"],
    };
    let pageDocumentScanCount = 0;
    const ctx = {
      db: {
        get: async (id: string) => (id === revision._id ? revision : null),
        query: (table: string) => ({
          withIndex: () => {
            if (table === "pages") {
              return {
                [Symbol.asyncIterator]: async function* () {
                  yield page;
                },
              };
            }
            pageDocumentScanCount += 1;
            return { collect: async () => [document] };
          },
        }),
      },
    };

    const referenced = await getDraftReferencedFileIds(ctx as never, {
      _id: "site-1" as never,
      logoFileId: "logo-1" as never,
      faviconFileId: undefined,
    });

    expect(pageDocumentScanCount).toBe(1);
    expect([...referenced].map(String)).toEqual(["logo-1", "file-1"]);
  });

  test("bounds and normalizes page descriptions", () => {
    expect(truncateDescription("  one   two  ")).toBe("one two");
    expect(truncateDescription("x".repeat(281))).toBe(`${"x".repeat(279)}…`);
  });
});
