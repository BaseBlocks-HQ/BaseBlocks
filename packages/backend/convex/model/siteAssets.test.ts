import { describe, expect, test } from "bun:test";
import { claimSiteAssetForPurge, reconcileSiteAsset } from "./siteAssets";

function lifecycleContext({
  referenced = false,
  state = "pending",
  purgeAfter = 100,
}: {
  referenced?: boolean;
  state?: "pending" | "attached" | "retired";
  purgeAfter?: number;
} = {}) {
  const patches: Array<Record<string, unknown>> = [];
  const file = {
    _id: "file-1",
    siteId: "site-1",
    kind: "siteAsset",
    size: 10,
    assetState: state,
    assetPurgeAfter: purgeAfter,
    createdAt: 1,
  };
  const site = {
    _id: "site-1",
    organizationId: "organization-1",
    logoFileId: referenced ? file._id : undefined,
  };
  const ctx = {
    db: {
      get: async (id: string) =>
        id === file._id ? { ...file, ...Object.assign({}, ...patches) } : site,
      patch: async (_id: string, value: Record<string, unknown>) => {
        patches.push(value);
      },
      insert: async () => "event-1",
      query: (table: string) => ({
        withIndex: () => ({
          collect: async () => [],
          first: async () => null,
          unique: async () =>
            table === "workspaceStorageUsage"
              ? {
                  activeFileBytes: 10n,
                  retainedFileBytes: 0n,
                  contentPayloadBytes: 0n,
                  logicalRevisionBytes: 0n,
                  activeFileCount: 1,
                  retainedFileCount: 0,
                  contentPayloadCount: 0,
                }
              : null,
        }),
      }),
    },
  };
  return { ctx: ctx as never, patches };
}

describe("site asset lifecycle", () => {
  test("keeps an unreferenced upload pending during its draft window", async () => {
    const { ctx, patches } = lifecycleContext();
    await reconcileSiteAsset(ctx, "file-1" as never, { now: 50 });
    expect(patches).toEqual([]);
  });

  test("retires an abandoned pending upload immediately", async () => {
    const { ctx, patches } = lifecycleContext();
    await reconcileSiteAsset(ctx, "file-1" as never, {
      now: 50,
      abandonPending: true,
    });
    expect(patches.at(-1)).toMatchObject({
      assetState: "retired",
      assetPurgeAfter: 50,
      deletedAt: 50,
    });
  });

  test("rechecks references before a physical purge claim", async () => {
    const { ctx, patches } = lifecycleContext({
      referenced: true,
      state: "retired",
    });
    const claimed = await claimSiteAssetForPurge(ctx, "file-1" as never, 200);
    expect(claimed).toBeNull();
    expect(patches.at(-1)).toMatchObject({
      assetState: "attached",
      assetPurgeAfter: undefined,
    });
  });
});
