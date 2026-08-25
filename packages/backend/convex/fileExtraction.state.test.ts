import { describe, expect, test } from "bun:test";
import type { WorkId } from "@convex-dev/workpool";
import {
  completed,
  fileIngestion,
  fileIngestionBinding,
  storeResult,
  type FileIngestionJob,
  queueFileExtraction,
} from "./fileExtraction";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

type Projection = {
  _id: string;
  fileId: string;
  siteId: string;
  sourceVersion: string;
  generation: number;
  idempotencyKey: string;
  workId?: string;
  status: "queued" | "processing" | "ready" | "failed";
  createdAt: number;
  updatedAt: number;
};

function projection(workId?: string): Projection {
  return {
    _id: "extraction-1",
    fileId: "file-1",
    siteId: "site-1",
    sourceVersion: "object\u000010\u0000sum",
    generation: 2,
    idempotencyKey: "file-1:2:object\u000010\u0000sum",
    workId,
    status: "ready" as const,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("AnyDoc Workpool binding", () => {
  test("bind deduplicates and cancel generation-fences the winner", async () => {
    let state = projection();
    const ctx = {
      db: {
        query: () => ({ withIndex: () => ({ unique: async () => state }) }),
        patch: async (_id: string, value: Record<string, unknown>) => {
          state = { ...state, ...value } as typeof state;
        },
      },
    };
    const job: FileIngestionJob = {
      entityId: state.fileId,
      sourceVersion: state.sourceVersion,
      generation: state.generation,
      idempotencyKey: state.idempotencyKey,
      source: { fileId: state.fileId as never },
    };
    const first = "work-1" as WorkId;
    const duplicate = "work-2" as WorkId;

    expect(await fileIngestionBinding.bind(ctx as never, job, first)).toBe(
      first,
    );
    expect(await fileIngestionBinding.bind(ctx as never, job, duplicate)).toBe(
      first,
    );
    const receipt = { ...job, workId: first };
    expect(await fileIngestionBinding.cancel(ctx as never, receipt)).toBeTrue();
    expect(state.generation).toBe(3);
    expect(state.workId).toBeUndefined();
    expect(
      await fileIngestionBinding.cancel(ctx as never, receipt),
    ).toBeFalse();
  });

  test("successful completion clears the finished work identity", async () => {
    let state = projection("work-1");
    const ctx = {
      db: {
        query: () => ({ withIndex: () => ({ unique: async () => state }) }),
        patch: async (_id: string, value: Record<string, unknown>) => {
          state = { ...state, ...value } as typeof state;
        },
      },
    };

    await invoke(completed, ctx, {
      workId: "work-1",
      context: {
        entityId: state.fileId,
        sourceVersion: state.sourceVersion,
        generation: state.generation,
        idempotencyKey: state.idempotencyKey,
        source: { fileId: state.fileId },
      },
      result: { kind: "success", returnValue: { status: "applied" } },
    });
    expect(state.workId).toBeUndefined();
  });

  test("late results are fenced after the file is deleted", async () => {
    const state = projection("work-1");
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({ unique: async () => state }),
        }),
        get: async () => ({
          _id: state.fileId,
          kind: "file",
          deletedAt: 2,
        }),
      },
    };

    await expect(
      invoke(storeResult, ctx, {
        entityId: state.fileId,
        sourceVersion: state.sourceVersion,
        generation: state.generation,
        idempotencyKey: state.idempotencyKey,
        source: { fileId: state.fileId },
        text: "late result",
        format: "markdown",
        inputBytes: 12,
      }),
    ).resolves.toEqual({ status: "superseded" });
  });

  test("force retry replaces a ready generation without cancelling finished work", async () => {
    let state = projection();
    const file = {
      _id: state.fileId,
      siteId: state.siteId,
      kind: "file" as const,
      objectKey: "object",
      filename: "document.pdf",
      contentType: "application/pdf",
      size: 10,
      checksum: "sum",
    };
    let cancelled = false;
    const originalEnqueue = fileIngestion.enqueue;
    const originalCancel = fileIngestion.cancel;
    fileIngestion.enqueue = async (_ctx, job) => ({
      entityId: job.entityId,
      sourceVersion: job.sourceVersion,
      generation: job.generation,
      idempotencyKey: job.idempotencyKey,
      workId: "work-2" as WorkId,
    });
    fileIngestion.cancel = async () => {
      cancelled = true;
      return true;
    };
    const ctx = {
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            unique: async () => (table === "fileExtractions" ? state : null),
          }),
        }),
        replace: async (_id: string, value: typeof state) => {
          state = { ...state, ...value };
        },
        insert: async () => "search-1",
      },
    };

    try {
      expect(
        await queueFileExtraction(ctx as never, file as never, { force: true }),
      ).toBe("work-2" as WorkId);
      expect(state.generation).toBe(3);
      expect(state.status).toBe("queued");
      expect(cancelled).toBeFalse();
    } finally {
      fileIngestion.enqueue = originalEnqueue;
      fileIngestion.cancel = originalCancel;
    }
  });
});
