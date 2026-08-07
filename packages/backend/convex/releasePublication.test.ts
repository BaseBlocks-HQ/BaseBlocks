import { describe, expect, test } from "bun:test";
import {
  draftChangeMatchesPublication,
  handleBatchFailure,
  publicationBatchMatches,
} from "./releasePublication";
import { makeLive } from "./releases";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

const activePublication = {
  _id: "release-1",
  publicationStatus: "building" as const,
  publicationToken: "token-1",
  publicationPhase: "pages" as const,
  publicationCursor: "cursor-1",
  publicationAttempt: 1,
};

describe("release publication fencing", () => {
  test("rejects stale token, phase, cursor, attempt, and terminal state", () => {
    const current = {
      token: activePublication.publicationToken,
      phase: activePublication.publicationPhase,
      cursor: activePublication.publicationCursor,
      attempt: activePublication.publicationAttempt,
    };

    expect(publicationBatchMatches(activePublication, current)).toBe(true);
    expect(
      publicationBatchMatches(activePublication, {
        ...current,
        token: "stale",
      }),
    ).toBe(false);
    expect(
      publicationBatchMatches(activePublication, {
        ...current,
        phase: "libraries",
      }),
    ).toBe(false);
    expect(
      publicationBatchMatches(activePublication, {
        ...current,
        cursor: "stale",
      }),
    ).toBe(false);
    expect(
      publicationBatchMatches(activePublication, { ...current, attempt: 0 }),
    ).toBe(false);
    expect(
      publicationBatchMatches(
        { ...activePublication, publicationStatus: "complete" },
        current,
      ),
    ).toBe(false);
  });

  test("a current failure advances the persisted attempt exactly once", async () => {
    const patches: Array<Record<string, unknown>> = [];
    const scheduled: Array<Record<string, unknown>> = [];
    const ctx = {
      db: {
        get: async () => activePublication,
        patch: async (_id: string, value: Record<string, unknown>) => {
          patches.push(value);
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

    await invoke(handleBatchFailure, ctx, {
      releaseId: activePublication._id,
      token: activePublication.publicationToken,
      phase: activePublication.publicationPhase,
      cursor: activePublication.publicationCursor,
      attempt: activePublication.publicationAttempt,
      failure: "transient",
    });

    expect(patches).toEqual([
      expect.objectContaining({ publicationAttempt: 2 }),
    ]);
    expect(scheduled).toEqual([expect.objectContaining({ attempt: 2 })]);
  });

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
