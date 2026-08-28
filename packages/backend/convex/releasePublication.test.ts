import { describe, expect, test } from "bun:test";
import { internal } from "./_generated/api";
import { cleanupFailedRelease, recover } from "./releasePublication";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

type Row = Record<string, unknown> & { _id: string };

function makeContext(tables: Record<string, Row[]>) {
  const patches: Array<[string, Record<string, unknown>]> = [];
  const deleted: string[] = [];
  const scheduled: Array<{
    delay: number;
    functionReference: unknown;
    args: Record<string, unknown>;
  }> = [];

  return {
    patches,
    deleted,
    scheduled,
    db: {
      get: async (id: string) => {
        for (const rows of Object.values(tables)) {
          const row = rows.find((candidate) => candidate._id === id);
          if (row) return row;
        }
        return null;
      },
      patch: async (id: string, values: Record<string, unknown>) => {
        for (const rows of Object.values(tables)) {
          const row = rows.find((candidate) => candidate._id === id);
          if (row) Object.assign(row, values);
        }
        patches.push([id, values]);
      },
      delete: async (id: string) => {
        for (const rows of Object.values(tables)) {
          const index = rows.findIndex((candidate) => candidate._id === id);
          if (index >= 0) rows.splice(index, 1);
        }
        deleted.push(id);
      },
      query: (table: string) => ({
        withIndex: () => ({
          collect: async () => tables[table] ?? [],
          paginate: async () => ({
            page: tables[table] ?? [],
            isDone: true,
            continueCursor: "",
          }),
        }),
      }),
    },
    scheduler: {
      runAfter: async (
        delay: number,
        functionReference: unknown,
        args: Record<string, unknown>,
      ) => {
        scheduled.push({ delay, functionReference, args });
      },
    },
  };
}

describe("legacy publication workflow recovery", () => {
  test("marks an interrupted building release unavailable", async () => {
    const release: Row = {
      _id: "release-1",
      siteId: "site-1",
      publicationStatus: "building",
    };
    const state = makeContext({ siteReleases: [release] });

    await invoke(recover, state, { releaseId: release._id });

    expect(release).toMatchObject({
      publicationStatus: "failed",
      publicationFailure:
        "The legacy publication was interrupted during the publishing refactor.",
    });
    expect(state.scheduled).toEqual([
      {
        delay: 0,
        functionReference: internal.releasePublication.cleanupFailedRelease,
        args: { releaseId: release._id, phase: "pages" },
      },
    ]);
  });

  test("cleans partial release snapshots in bounded phases", async () => {
    const release: Row = {
      _id: "release-1",
      siteId: "site-1",
      publicationStatus: "failed",
    };
    const tables = {
      siteReleases: [release],
      releasePages: [{ _id: "page-snapshot", releaseId: release._id }],
      releaseLibraries: [{ _id: "library-snapshot", releaseId: release._id }],
      releaseFolders: [{ _id: "folder-snapshot", releaseId: release._id }],
      releaseFiles: [{ _id: "file-snapshot", releaseId: release._id }],
      searchEntries: [
        { _id: "search-snapshot", scopeId: `release:${release._id}` },
      ],
      releaseChanges: [{ _id: "change-snapshot", releaseId: release._id }],
    } satisfies Record<string, Row[]>;
    const state = makeContext(tables);

    for (const phase of [
      "pages",
      "libraries",
      "folders",
      "files",
      "search",
      "changes",
    ] as const) {
      await invoke(cleanupFailedRelease, state, {
        releaseId: release._id,
        phase,
      });
    }

    expect(tables.releasePages).toHaveLength(0);
    expect(tables.releaseLibraries).toHaveLength(0);
    expect(tables.releaseFolders).toHaveLength(0);
    expect(tables.releaseFiles).toHaveLength(0);
    expect(tables.searchEntries).toHaveLength(0);
    expect(tables.releaseChanges).toHaveLength(0);
  });

  test("finishes cleanup only for the exact snapshotted draft generation", async () => {
    const release: Row = {
      _id: "release-1",
      siteId: "site-1",
      publicationStatus: "clearing",
    };
    const site: Row = {
      _id: "site-1",
      liveReleaseId: release._id,
    };
    const state = makeContext({
      siteReleases: [release],
      sites: [site],
      releaseChanges: [
        {
          _id: "snapshot-1",
          releaseId: release._id,
          sourceDraftChangeId: "change-1",
          sourceDraftRevision: 7,
        },
        {
          _id: "snapshot-2",
          releaseId: release._id,
          sourceDraftChangeId: "change-2",
          sourceDraftRevision: 6,
        },
      ],
      draftChanges: [
        { _id: "change-1", siteId: site._id, draftRevision: 7 },
        { _id: "change-2", siteId: site._id, draftRevision: 8 },
        { _id: "change-3", siteId: site._id, draftRevision: 7 },
      ],
    });

    await invoke(recover, state, { releaseId: release._id });

    expect(release.publicationStatus).toBe("complete");
    expect(state.deleted).toEqual(["change-1"]);
    expect(state.scheduled).toEqual([
      {
        delay: 0,
        functionReference: internal.publication.projectLiveSearch,
        args: { siteId: site._id, expectedLiveReleaseId: release._id },
      },
    ]);
  });
});
