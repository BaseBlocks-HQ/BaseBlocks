import { describe, expect, test } from "bun:test";
import { runBatch } from "./workspaceMigrations";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function migrationContext({
  existingRun = null,
  mode,
}: {
  existingRun?: Record<string, unknown> | null;
  mode: "dryRun" | "apply";
}) {
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  let adapterCall = 0;
  const ctx = {
    runQuery: () => {
      adapterCall += 1;
      return adapterCall === 1
        ? Promise.resolve({
            page: [{ _id: "organization-1" }],
            isDone: true,
            continueCursor: "",
          })
        : Promise.resolve({ page: [{}], isDone: true, continueCursor: "" });
    },
    db: {
      query: (table: string) => ({
        withIndex: () => ({
          unique: () =>
            Promise.resolve(
              table === "workspaceMigrationRuns" ? existingRun : null,
            ),
        }),
      }),
      insert: (table: string, value: Record<string, unknown>) => {
        inserts.push({ table, value });
        return Promise.resolve(`${table}-id`);
      },
      replace: () => Promise.resolve(),
    },
  };
  return { ctx, inserts, mode };
}

describe("workspace intent migration", () => {
  test("dry run reports classification without writing a profile", async () => {
    const fixture = migrationContext({ mode: "dryRun" });
    const result = await (runBatch as unknown as RegisteredFunction)._handler(
      fixture.ctx,
      { runId: "dry-1", mode: fixture.mode },
    );
    expect(result).toMatchObject({
      status: "completed",
      scannedCount: 1,
      personalCount: 1,
      createdCount: 0,
      errorCount: 0,
    });
    expect(fixture.inserts.map((entry) => entry.table)).toEqual([
      "workspaceMigrationRuns",
    ]);
  });

  test("apply creates one missing personal profile", async () => {
    const fixture = migrationContext({ mode: "apply" });
    const result = await (runBatch as unknown as RegisteredFunction)._handler(
      fixture.ctx,
      { runId: "apply-1", mode: fixture.mode },
    );
    expect(result).toMatchObject({ createdCount: 1, personalCount: 1 });
    expect(fixture.inserts).toEqual([
      {
        table: "workspaceProfiles",
        value: expect.objectContaining({
          organizationId: "organization-1",
          intent: "personal",
          source: "migration",
        }),
      },
      {
        table: "workspaceMigrationRuns",
        value: expect.objectContaining({ runId: "apply-1" }),
      },
    ]);
  });

  test("completed run is an idempotent no-op", async () => {
    const completed = {
      migrationKey: "workspace-intent-v1",
      runId: "complete-1",
      mode: "apply",
      status: "completed",
      createdCount: 4,
    };
    const fixture = migrationContext({ existingRun: completed, mode: "apply" });
    const result = await (runBatch as unknown as RegisteredFunction)._handler(
      fixture.ctx,
      { runId: "complete-1", mode: "apply" },
    );
    expect(result).toBe(completed);
    expect(fixture.inserts).toEqual([]);
  });
});
