import { describe, expect, test } from "bun:test";
import { assertDraftReadable, assertDraftWritable } from "./model/draft";
import { applyBatch, finish } from "./draftRestore";
import { publish } from "./releases";
import { restore, resume } from "./draftRestores";
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
  createdAt: 1,
  updatedAt: 1,
};

describe("draft restore ownership", () => {
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
    expect(await invoke(restore, ctx, { releaseId: release._id })).toEqual({
      restoreId: activeRestore._id,
      reused: true,
    });

    await expect(
      invoke(
        restore,
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
      failure: expect.stringContaining("remains locked"),
    });
  });
});

describe("draft restore workflow", () => {
  test("preflight rejects a revision whose content payload is missing", async () => {
    const restore = {
      ...activeRestore,
      status: "validating" as const,
      phase: "validatePages" as const,
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
        phase: restore.phase,
      }),
    ).rejects.toThrow("content payload is missing");
  });

  test("activation changes the draft pointer but never the live release", async () => {
    const restore = {
      ...activeRestore,
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
    await invoke(finish, ctx, {
      restoreId: restore._id,
    });
    const sitePatch = patches.find(([id]) => id === site._id)?.[1];
    expect(sitePatch).toMatchObject({
      draftBaseReleaseId: release._id,
      activeDraftRestoreId: undefined,
    });
    expect(sitePatch).not.toHaveProperty("liveReleaseId");
  });

  test("resume rejects a workflow that has not failed", async () => {
    const restore = {
      ...activeRestore,
      status: "paused" as const,
      workflowId: "workflow-1",
    };
    const site = {
      _id: restore.siteId,
      organizationId: "organization-1",
      activeDraftRestoreId: restore._id,
    };
    let queryCount = 0;
    const ctx = {
      auth: {
        getUserIdentity: async () => ({ subject: restore.requestedBy }),
      },
      runQuery: async () => {
        queryCount += 1;
        if (queryCount === 1) {
          return {
            _id: "member-1",
            organizationId: site.organizationId,
            role: "owner",
            userId: restore.requestedBy,
          };
        }
        return {
          workflow: { runResult: undefined },
          inProgress: [],
          logLevel: "INFO",
        };
      },
      db: {
        get: async (id: string) => (id === restore._id ? restore : site),
      },
    };

    await expect(
      invoke(resume, ctx, { restoreId: restore._id }),
    ).rejects.toThrow("cannot be resumed");
    expect(queryCount).toBe(2);
  });

  test("resume restarts a paused restore only after component failure", async () => {
    const restore = {
      ...activeRestore,
      status: "paused" as const,
      workflowId: "workflow-1",
    };
    const site = {
      _id: restore.siteId,
      organizationId: "organization-1",
      activeDraftRestoreId: restore._id,
    };
    const patches: Array<Record<string, unknown>> = [];
    const mutations: Array<Record<string, unknown>> = [];
    let queryCount = 0;
    const ctx = {
      auth: {
        getUserIdentity: async () => ({ subject: restore.requestedBy }),
      },
      runQuery: async () => {
        queryCount += 1;
        if (queryCount === 1) {
          return {
            _id: "member-1",
            organizationId: site.organizationId,
            role: "owner",
            userId: restore.requestedBy,
          };
        }
        return {
          workflow: {
            runResult: { kind: "failed", error: "transient failure" },
          },
          inProgress: [],
          logLevel: "INFO",
        };
      },
      runMutation: async (_fn: unknown, args: Record<string, unknown>) => {
        mutations.push(args);
      },
      db: {
        get: async (id: string) => (id === restore._id ? restore : site),
        patch: async (_id: string, value: Record<string, unknown>) => {
          patches.push(value);
        },
      },
    };

    await invoke(resume, ctx, { restoreId: restore._id });
    expect(patches).toContainEqual(
      expect.objectContaining({ status: "applying", failure: undefined }),
    );
    expect(mutations).toEqual([
      expect.objectContaining({ workflowId: restore.workflowId }),
    ]);
  });
});
