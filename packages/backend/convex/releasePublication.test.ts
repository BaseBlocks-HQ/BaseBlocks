import { describe, expect, test } from "bun:test";
import { draftChangeMatchesPublication } from "./releasePublication";
import { makeLive, publish } from "./releases";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

describe("release publication fencing", () => {
  test("authorization runs before publication state is disclosed", async () => {
    let permissionChecks = 0;
    const release = {
      _id: "release-1",
      siteId: "site-1",
      publicationStatus: "building",
    };
    const site = { _id: "site-1", organizationId: "organization-1" };
    const ctx = {
      auth: {
        getUserIdentity: async () => ({ subject: "unauthorized-user" }),
      },
      db: {
        get: async (id: string) => (id === release._id ? release : site),
      },
      runQuery: async () => {
        permissionChecks += 1;
        return null;
      },
    };

    await expect(
      invoke(makeLive, ctx, { releaseId: release._id }),
    ).rejects.not.toThrow("Release publication is not complete");
    expect(permissionChecks).toBe(1);
  });

  test("promotes an existing complete release without waiting for extraction", async () => {
    const release = {
      _id: "release-1",
      siteId: "site-1",
      number: 3,
      publicationStatus: "complete",
    };
    const site = {
      _id: release.siteId,
      organizationId: "organization-1",
      draftRevision: 9,
      draftBaseReleaseId: release._id,
      liveReleaseId: undefined,
    };
    let queriedExtractions = false;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "user-1" }) },
      runQuery: async () => ({
        _id: "member-1",
        organizationId: site.organizationId,
        role: "owner",
        userId: "user-1",
      }),
      db: {
        get: async (id: string) => (id === site._id ? site : release),
        query: (table: string) => {
          if (table === "fileExtractions") queriedExtractions = true;
          return {
            withIndex: () => ({ first: async () => null }),
          };
        },
        patch: async () => undefined,
        insert: async () => "event-1",
      },
    };

    expect(
      await invoke(publish, ctx, {
        siteId: site._id,
        expectedDraftRevision: site.draftRevision,
      }),
    ).toEqual({ releaseId: release._id, number: release.number, reused: true });
    expect(queriedExtractions).toBe(false);
  });

  test("rejects an in-flight publication with no workflow identity", async () => {
    const release = {
      _id: "release-1",
      siteId: "site-1",
      number: 3,
      sourceDraftRevision: 9,
      publicationStatus: "building",
    };
    const site = {
      _id: release.siteId,
      organizationId: "organization-1",
      draftRevision: release.sourceDraftRevision,
    };
    let publicationQuery = 0;
    const ctx = {
      auth: { getUserIdentity: async () => ({ subject: "user-1" }) },
      runQuery: async () => ({
        _id: "member-1",
        organizationId: site.organizationId,
        role: "owner",
        userId: "user-1",
      }),
      db: {
        get: async () => site,
        query: () => ({
          withIndex: () => ({
            first: async () => {
              publicationQuery += 1;
              return publicationQuery === 1 ? release : null;
            },
          }),
        }),
      },
    };

    await expect(
      invoke(publish, ctx, {
        siteId: site._id,
        expectedDraftRevision: site.draftRevision,
      }),
    ).rejects.toThrow("workflow state is missing");
  });
});

describe("published draft-change cleanup", () => {
  test("deletes only the exact snapshotted draft generation", () => {
    const snapshot = {
      sourceDraftChangeId: "change-1" as never,
      sourceDraftRevision: 7,
    };
    expect(
      draftChangeMatchesPublication(
        {
          _id: "change-1" as never,
          draftRevision: 7,
          updatedAt: 100,
        },
        snapshot,
      ),
    ).toBe(true);
    expect(
      draftChangeMatchesPublication(
        {
          _id: "change-1" as never,
          draftRevision: 8,
          updatedAt: 100,
        },
        snapshot,
      ),
    ).toBe(false);
  });
});
