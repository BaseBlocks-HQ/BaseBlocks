import { describe, expect, test } from "bun:test";
import { assertDraftReadable, assertDraftWritable } from "./model/draft";
import {
  applyBatch,
  handleBatchFailure,
  nextDraftRestorePhase,
  restoreBatchMatches,
} from "./draftRestore";
import { publish, restoreToDraft, resumeDraftRestore } from "./releases";
import { list as listPages } from "./pages";
import { draftRestoreView } from "./editorWorkspace";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

const activeRestore = {
  _id: "restore-1",
  siteId: "site-1",
  releaseId: "release-1",
  requestedBy: "user-1",
  baseDraftRevision: 7,
  status: "applying" as const,
  phase: "restorePages" as const,
  token: "current-token",
  cursor: "current-cursor",
  attempt: 2,
  createdAt: 1,
  updatedAt: 1,
};

describe("draft restore fencing", () => {
  test("rejects stale token, phase, cursor, attempt, and terminal state", () => {
    const current = {
      token: activeRestore.token,
      phase: activeRestore.phase,
      cursor: activeRestore.cursor,
      attempt: activeRestore.attempt,
    };
    expect(restoreBatchMatches(activeRestore, current)).toBe(true);
    expect(
      restoreBatchMatches(activeRestore, { ...current, token: "stale" }),
    ).toBe(false);
    expect(
      restoreBatchMatches(activeRestore, {
        ...current,
        phase: "archivePages",
      }),
    ).toBe(false);
    expect(
      restoreBatchMatches(activeRestore, { ...current, cursor: "stale" }),
    ).toBe(false);
    expect(restoreBatchMatches(activeRestore, { ...current, attempt: 1 })).toBe(
      false,
    );
    expect(
      restoreBatchMatches({ ...activeRestore, status: "paused" }, current),
    ).toBe(false);
  });

  test("a stale scheduled batch exits before reading site state", async () => {
    let reads = 0;
    const ctx = {
      db: {
        get: async () => {
          reads += 1;
          return activeRestore;
        },
      },
    };
    expect(
      await invoke(applyBatch, ctx, {
        restoreId: activeRestore._id,
        token: "stale",
        phase: activeRestore.phase,
        cursor: activeRestore.cursor,
        attempt: activeRestore.attempt,
      }),
    ).toEqual({ applied: false });
    expect(reads).toBe(1);
  });

  test("draft edits are rejected while a restore owns the site", () => {
    expect(() =>
      assertDraftWritable({ activeDraftRestoreId: activeRestore._id as never }),
    ).toThrow("currently being restored");
  });

  test("a concurrent restore start reuses only the same actor and target", async () => {
    const release = {
      _id: activeRestore.releaseId,
      siteId: activeRestore.siteId,
      publicationStatus: "complete",
    };
    const site = {
      _id: activeRestore.siteId,
      organizationId: "organization-1",
      activeDraftRestoreId: activeRestore._id,
    };
    const member = {
      _id: "member-1",
      organizationId: site.organizationId,
      role: "owner",
      userId: activeRestore.requestedBy,
    };
    const ctx = {
      auth: {
        getUserIdentity: async () => ({ subject: activeRestore.requestedBy }),
      },
      runQuery: async () => member,
      db: {
        get: async (id: string) =>
          id === release._id ? release : id === site._id ? site : activeRestore,
      },
    };
    expect(
      await invoke(restoreToDraft, ctx, { releaseId: release._id }),
    ).toEqual({ restoreId: activeRestore._id, reused: true });

    await expect(
      invoke(
        restoreToDraft,
        {
          ...ctx,
          db: {
            get: async (id: string) =>
              id === release._id
                ? release
                : id === site._id
                  ? site
                  : { ...activeRestore, releaseId: "another-release" },
          },
        },
        { releaseId: release._id },
      ),
    ).rejects.toThrow();
  });

  test("publication is rejected while a restore owns the draft", async () => {
    const site = {
      _id: activeRestore.siteId,
      organizationId: "organization-1",
      activeDraftRestoreId: activeRestore._id,
      draftRevision: activeRestore.baseDraftRevision,
    };
    const ctx = {
      auth: {
        getUserIdentity: async () => ({ subject: activeRestore.requestedBy }),
      },
      runQuery: async () => ({
        _id: "member-1",
        organizationId: site.organizationId,
        role: "owner",
        userId: activeRestore.requestedBy,
      }),
      db: { get: async () => site },
    };
    await expect(
      invoke(publish, ctx, {
        siteId: site._id,
        expectedDraftRevision: site.draftRevision,
      }),
    ).rejects.toThrow("currently being restored");
  });
});

describe("draft restore read gating", () => {
  test("private draft reads are unavailable while a restore owns the site", () => {
    expect(() =>
      assertDraftReadable({ activeDraftRestoreId: activeRestore._id as never }),
    ).toThrow("draft is unavailable");
  });

  test("page reads authorize before reporting restore unavailability", async () => {
    const site = {
      _id: activeRestore.siteId,
      organizationId: "organization-1",
      activeDraftRestoreId: activeRestore._id,
    };
    const baseCtx = {
      auth: {
        getUserIdentity: async () => ({ subject: activeRestore.requestedBy }),
      },
      db: {
        get: async () => site,
      },
    };

    expect(
      await invoke(
        listPages,
        { ...baseCtx, runQuery: async () => null },
        { siteId: site._id },
      ),
    ).toEqual([]);

    await expect(
      invoke(
        listPages,
        {
          ...baseCtx,
          runQuery: async () => ({
            organizationId: site.organizationId,
            userId: activeRestore.requestedBy,
          }),
        },
        { siteId: site._id },
      ),
    ).rejects.toThrow("draft is unavailable");
  });

  test("a dangling restore lock is projected as an explicit recovery state", () => {
    expect(draftRestoreView(activeRestore._id as never, null)).toEqual({
      _id: activeRestore._id as never,
      status: "orphaned",
      phase: "missing",
      failure: expect.stringContaining("remains locked"),
    });
  });
});

describe("draft restore phase recovery", () => {
  test("every interrupted phase has one deterministic successor", () => {
    expect(Object.entries(nextDraftRestorePhase)).toEqual([
      ["validatePages", "validateLibraries"],
      ["validateLibraries", "validateFolders"],
      ["validateFolders", "validateFiles"],
      ["validateFiles", "archivePages"],
      ["archivePages", "restorePages"],
      ["restorePages", "archiveLibraries"],
      ["archiveLibraries", "restoreLibraries"],
      ["restoreLibraries", "archiveFolders"],
      ["archiveFolders", "restoreFolders"],
      ["restoreFolders", "archiveFiles"],
      ["archiveFiles", "restoreFiles"],
      ["restoreFiles", "synchronizeParents"],
      ["synchronizeParents", "clearDraftChanges"],
      ["clearDraftChanges", "activate"],
      ["activate", null],
    ]);
  });

  test("preflight exhaustion fails and releases the site lock", async () => {
    const restore = {
      ...activeRestore,
      status: "validating" as const,
      phase: "validateFiles" as const,
      cursor: undefined,
      attempt: 4,
    };
    const site = {
      _id: restore.siteId,
      activeDraftRestoreId: restore._id,
    };
    const patches: Array<[string, Record<string, unknown>]> = [];
    const ctx = {
      db: {
        get: async (id: string) => (id === restore._id ? restore : site),
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push([id, value]);
        },
      },
    };
    expect(
      await invoke(handleBatchFailure, ctx, {
        restoreId: restore._id,
        token: restore.token,
        phase: restore.phase,
        attempt: restore.attempt,
        failure: "missing historical content",
      }),
    ).toEqual({ applied: true, paused: true });
    expect(patches).toContainEqual([
      site._id,
      { activeDraftRestoreId: undefined },
    ]);
    expect(patches).toContainEqual([
      restore._id,
      expect.objectContaining({ status: "failed" }),
    ]);
  });

  test("preflight rejects a revision whose content payload is missing", async () => {
    const restore = {
      ...activeRestore,
      status: "validating" as const,
      phase: "validatePages" as const,
      cursor: undefined,
      attempt: 0,
    };
    const site = {
      _id: restore.siteId,
      activeDraftRestoreId: restore._id,
      draftRevision: restore.baseDraftRevision,
    };
    const snapshot = {
      pageId: "page-1",
      contentRevisionId: "revision-1",
    };
    const revision = {
      _id: snapshot.contentRevisionId,
      siteId: restore.siteId,
      payloadId: "missing-payload",
    };
    const ctx = {
      db: {
        get: async (id: string) => {
          if (id === restore._id) return restore;
          if (id === site._id) return site;
          if (id === snapshot.pageId)
            return { _id: id, siteId: restore.siteId };
          if (id === revision._id) return revision;
          return null;
        },
        query: () => ({
          withIndex: () => ({
            paginate: async () => ({
              page: [snapshot],
              isDone: true,
              continueCursor: "",
            }),
          }),
        }),
      },
    };

    await expect(
      invoke(applyBatch, ctx, {
        restoreId: restore._id,
        token: restore.token,
        phase: restore.phase,
        attempt: restore.attempt,
      }),
    ).rejects.toThrow("content payload is missing");
  });

  test("post-application exhaustion pauses and retains the lock", async () => {
    const restore = { ...activeRestore, attempt: 4 };
    const patches: Array<[string, Record<string, unknown>]> = [];
    const ctx = {
      db: {
        get: async () => restore,
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push([id, value]);
        },
      },
    };
    await invoke(handleBatchFailure, ctx, {
      restoreId: restore._id,
      token: restore.token,
      phase: restore.phase,
      cursor: restore.cursor,
      attempt: restore.attempt,
      failure: "transient storage failure",
    });
    expect(patches).toEqual([
      [restore._id, expect.objectContaining({ status: "paused" })],
    ]);
  });

  test("an authorized resume rolls forward from the fenced phase and cursor", async () => {
    const restore = { ...activeRestore, status: "paused" as const };
    const site = {
      _id: restore.siteId,
      organizationId: "organization-1",
      activeDraftRestoreId: restore._id,
    };
    const patches: Array<[string, Record<string, unknown>]> = [];
    const scheduled: Array<Record<string, unknown>> = [];
    const ctx = {
      auth: {
        getUserIdentity: async () => ({ subject: restore.requestedBy }),
      },
      runQuery: async () => ({
        _id: "member-1",
        organizationId: site.organizationId,
        role: "owner",
        userId: restore.requestedBy,
      }),
      db: {
        get: async (id: string) => (id === restore._id ? restore : site),
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push([id, value]);
        },
      },
      scheduler: {
        runAfter: async (
          _delay: number,
          _function: unknown,
          args: Record<string, unknown>,
        ) => {
          scheduled.push(args);
        },
      },
    };
    await invoke(resumeDraftRestore, ctx, { restoreId: restore._id });
    expect(patches).toContainEqual([
      restore._id,
      expect.objectContaining({ status: "applying", attempt: 0 }),
    ]);
    expect(scheduled).toEqual([
      expect.objectContaining({
        restoreId: restore._id,
        phase: restore.phase,
        cursor: restore.cursor,
        attempt: 0,
      }),
    ]);
  });

  test("activation changes the draft pointer but never the live release", async () => {
    const restore = {
      ...activeRestore,
      phase: "activate" as const,
      cursor: undefined,
      attempt: 0,
    };
    const site = {
      _id: restore.siteId,
      activeDraftRestoreId: restore._id,
      draftRevision: restore.baseDraftRevision,
      liveReleaseId: "live-release",
    };
    const release = {
      _id: restore.releaseId,
      name: "Historical site",
      settings: {},
    };
    const patches: Array<[string, Record<string, unknown>]> = [];
    const ctx = {
      db: {
        get: async (id: string) =>
          id === restore._id ? restore : id === site._id ? site : release,
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push([id, value]);
        },
        insert: async () => "event-1",
      },
    };
    await invoke(applyBatch, ctx, {
      restoreId: restore._id,
      token: restore.token,
      phase: restore.phase,
      attempt: restore.attempt,
    });
    const sitePatch = patches.find(([id]) => id === site._id)?.[1];
    expect(sitePatch).toMatchObject({
      draftBaseReleaseId: release._id,
      activeDraftRestoreId: undefined,
    });
    expect(sitePatch).not.toHaveProperty("liveReleaseId");
  });
});
