import { describe, expect, test } from "bun:test";
import {
  backfillReleasePublicationStatuses,
  startReleasePublicationStatusBackfill,
} from "./migrations";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

describe("release publication status migration", () => {
  test("does not restart a completed migration", async () => {
    let scheduled = false;
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({
            unique: async () => ({
              status: "complete",
              processed: 19,
              updated: 19,
            }),
          }),
        }),
      },
      scheduler: { runAfter: async () => (scheduled = true) },
    };

    expect(
      await invoke(startReleasePublicationStatusBackfill, ctx, {}),
    ).toEqual({
      started: false,
      complete: true,
      processed: 19,
      updated: 19,
    });
    expect(scheduled).toBe(false);
  });

  test("fences a stale scheduled batch before scanning releases", async () => {
    let scanned = false;
    const ctx = {
      db: {
        query: (table: string) => {
          if (table === "siteReleases") scanned = true;
          return {
            withIndex: () => ({
              unique: async () => ({
                status: "running",
                runToken: "current-token",
                cursor: "current-cursor",
              }),
            }),
          };
        },
      },
    };

    expect(
      await invoke(backfillReleasePublicationStatuses, ctx, {
        token: "stale-token",
        cursor: "current-cursor",
      }),
    ).toEqual({
      applied: false,
      processed: 0,
      updated: 0,
      isDone: false,
    });
    expect(scanned).toBe(false);
  });

  test("patches only legacy rows and completes one bounded page", async () => {
    const patches: Array<[string, Record<string, unknown>]> = [];
    const job = {
      _id: "job-1",
      status: "running",
      runToken: "token-1",
      cursor: undefined,
      processed: 0,
      updated: 0,
    };
    const ctx = {
      db: {
        query: (table: string) => {
          if (table === "maintenanceJobs") {
            return { withIndex: () => ({ unique: async () => job }) };
          }
          return {
            paginate: async ({ numItems }: { numItems: number }) => {
              expect(numItems).toBe(50);
              return {
                page: [
                  { _id: "release-legacy", publicationStatus: undefined },
                  { _id: "release-current", publicationStatus: "complete" },
                ],
                isDone: true,
                continueCursor: "unused",
              };
            },
          };
        },
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push([id, value]);
        },
      },
    };

    expect(
      await invoke(backfillReleasePublicationStatuses, ctx, {
        token: "token-1",
      }),
    ).toEqual({ applied: true, processed: 2, updated: 1, isDone: true });
    expect(patches[0]).toEqual([
      "release-legacy",
      { publicationStatus: "complete" },
    ]);
    expect(patches[1]).toEqual([
      "job-1",
      expect.objectContaining({
        status: "complete",
        processed: 2,
        updated: 1,
      }),
    ]);
  });
});
