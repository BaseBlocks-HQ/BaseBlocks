import { describe, expect, test } from "bun:test";
import {
  cancelFileExtraction,
  complete,
  dispatchQueued,
  fail,
  getClaimed,
  getStatus,
  queueFileExtraction,
  recoverStalled,
  retry,
} from "./fileExtraction";
import {
  FILE_EXTRACTION_LIMITS,
  fileSourceVersion,
} from "./model/fileExtraction";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

function queryResult<T>(value: T) {
  const result = {
    withIndex: () => result,
    first: async () => value,
    take: async () => value,
  };
  return result;
}

function uploadedFile() {
  return {
    _id: "file-1",
    _creationTime: 1,
    siteId: "site-1",
    kind: "file" as const,
    visibility: "private" as const,
    objectKey: "sites/site-1/files/file-1/report.pdf",
    filename: "report.pdf",
    contentType: "application/pdf",
    size: 128,
    checksum: "etag-1",
    order: 0,
    uploadedBy: "user-1",
    createdAt: 1,
  };
}

describe("file extraction state machine", () => {
  test("dispatches no more than the configured global concurrency", async () => {
    const file = uploadedFile();
    const sourceVersion = fileSourceVersion(file as never);
    const jobs = Array.from({ length: 7 }, (_, index) => ({
      _id: `job-${index}`,
      fileId: file._id,
      extractionId: `extraction-${index}`,
      sourceVersion,
      status: "queued",
      attempt: 0,
      availableAt: 0,
      createdAt: 0,
      updatedAt: 0,
    }));
    const patches: Array<{ id: string; value: Record<string, unknown> }> = [];
    const scheduled: Array<{ args: Record<string, unknown> }> = [];
    const ctx = {
      db: {
        query: (table: string) =>
          table === "fileExtractionJobs"
            ? {
                withIndex: (index: string) => ({
                  take: async () => (index === "by_status_lease" ? [] : jobs),
                }),
              }
            : queryResult(null),
        get: async (id: string) =>
          id === file._id
            ? file
            : id.startsWith("extraction-")
              ? {
                  _id: id,
                  sourceVersion,
                  status: "queued",
                  attemptCount: 0,
                }
              : null,
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push({ id, value });
        },
        delete: async () => {},
      },
      scheduler: {
        runAfter: async (
          _delay: number,
          _function: unknown,
          args: Record<string, unknown>,
        ) => {
          scheduled.push({ args });
        },
      },
    };

    const result = (await invoke(dispatchQueued, ctx, {})) as {
      dispatched: number;
    };
    expect(result.dispatched).toBe(FILE_EXTRACTION_LIMITS.maxConcurrent);
    expect(scheduled).toHaveLength(FILE_EXTRACTION_LIMITS.maxConcurrent);
    expect(
      patches.filter(
        ({ id, value }) =>
          id.startsWith("job-") && value.status === "processing",
      ),
    ).toHaveLength(FILE_EXTRACTION_LIMITS.maxConcurrent);
  });

  test("fences stale worker tokens before reading file state", async () => {
    let reads = 0;
    const ctx = {
      db: {
        get: async () => {
          reads += 1;
          return {
            _id: "job-1",
            status: "processing",
            runToken: "current-token",
          };
        },
      },
    };
    expect(
      await invoke(getClaimed, ctx, {
        jobId: "job-1",
        runToken: "stale-token",
      }),
    ).toBeNull();
    expect(reads).toBe(1);
  });

  test("forced retry removes stale current-search extraction text", async () => {
    const file = uploadedFile();
    const sourceVersion = fileSourceVersion(file as never);
    const extraction = {
      _id: "extraction-1",
      sourceVersion,
      status: "ready",
      attemptCount: 1,
      createdAt: 1,
      extractedText: "obsolete confidential text",
    };
    const searchEntry = {
      _id: "search-1",
      text: "report.pdf obsolete confidential text",
    };
    const patches: Array<{ id: string; value: Record<string, unknown> }> = [];
    const replacements: Array<{
      id: string;
      value: Record<string, unknown>;
    }> = [];
    const ctx = {
      db: {
        query: (table: string) =>
          queryResult(
            table === "fileExtractions"
              ? extraction
              : table === "searchEntries"
                ? searchEntry
                : null,
          ),
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push({ id, value });
        },
        replace: async (id: string, value: Record<string, unknown>) => {
          replacements.push({ id, value });
        },
        insert: async () => "job-new",
      },
      scheduler: { runAfter: async () => {} },
    };

    await queueFileExtraction(ctx as never, file as never, { force: true });
    expect(patches).toContainEqual({
      id: searchEntry._id,
      value: expect.objectContaining({
        title: file.filename,
        text: "",
      }),
    });
    expect(replacements).toContainEqual({
      id: extraction._id,
      value: expect.objectContaining({
        status: "queued",
        attemptCount: 0,
      }),
    });
  });

  test("terminal failure clears stale current-search text", async () => {
    const file = uploadedFile();
    const sourceVersion = fileSourceVersion(file as never);
    const job = {
      _id: "job-1",
      fileId: file._id,
      extractionId: "extraction-1",
      sourceVersion,
      status: "processing",
      runToken: "token-1",
      attempt: 1,
    };
    const extraction = {
      _id: "extraction-1",
      sourceVersion,
      status: "processing",
    };
    const patches: Array<{ id: string; value: Record<string, unknown> }> = [];
    const ctx = {
      db: {
        get: async (id: string) =>
          id === job._id ? job : id === extraction._id ? extraction : file,
        query: () => queryResult({ _id: "search-1" }),
        patch: async (id: string, value: Record<string, unknown>) => {
          patches.push({ id, value });
        },
        delete: async () => {},
      },
      scheduler: { runAfter: async () => {} },
    };

    await invoke(fail, ctx, {
      jobId: job._id,
      runToken: job.runToken,
      failure: {
        code: "malformed",
        message: "Malformed document",
        retryable: false,
      },
    });
    expect(patches).toContainEqual({
      id: "search-1",
      value: expect.objectContaining({ text: "" }),
    });
  });

  test("completion updates only current search and leaves releases immutable", async () => {
    const file = uploadedFile();
    const sourceVersion = fileSourceVersion(file as never);
    const job = {
      _id: "job-1",
      fileId: file._id,
      extractionId: "extraction-1",
      sourceVersion,
      status: "processing",
      runToken: "token-1",
    };
    const extraction = { _id: "extraction-1", sourceVersion };
    const queriedTables: string[] = [];
    const insertedTables: string[] = [];
    const ctx = {
      db: {
        get: async (id: string) =>
          id === job._id ? job : id === extraction._id ? extraction : file,
        query: (table: string) => {
          queriedTables.push(table);
          return queryResult(null);
        },
        patch: async () => {},
        insert: async (table: string) => {
          insertedTables.push(table);
          return "search-1";
        },
        delete: async () => {},
      },
      scheduler: { runAfter: async () => {} },
    };

    expect(
      await invoke(complete, ctx, {
        jobId: job._id,
        runToken: job.runToken,
        deadlineAt: Date.now() + 60_000,
        text: "new searchable content",
        format: "pdf",
        inputBytes: file.size,
      }),
    ).toEqual({ applied: true });
    expect(queriedTables).toEqual(["searchEntries"]);
    expect(insertedTables).toEqual(["searchEntries"]);
  });

  test("completion rejects an expired attempt before reading mutable state", async () => {
    let reads = 0;
    const ctx = {
      db: {
        get: async () => {
          reads += 1;
          return {
            _id: "job-1",
            status: "processing",
            runToken: "token-1",
          };
        },
      },
    };

    expect(
      await invoke(complete, ctx, {
        jobId: "job-1",
        runToken: "token-1",
        deadlineAt: Date.now() - 1,
        text: "late content",
        format: "pdf",
        inputBytes: 128,
      }),
    ).toEqual({ applied: false, deadlineExceeded: true });
    expect(reads).toBe(1);
  });

  test("cron recovery always wakes overdue queued work", async () => {
    let dispatches = 0;
    const ctx = {
      db: {
        query: () => ({
          withIndex: () => ({ take: async () => [] }),
        }),
      },
      scheduler: {
        runAfter: async () => {
          dispatches += 1;
        },
      },
    };
    expect(await invoke(recoverStalled, ctx, {})).toEqual({ recovered: 0 });
    expect(dispatches).toBe(1);
  });

  test("deletion removes state but keeps a processing slot fenced", async () => {
    const deleted: string[] = [];
    let dispatches = 0;
    let queryCount = 0;
    const ctx = {
      db: {
        query: () => {
          queryCount += 1;
          return queryResult(
            queryCount === 1
              ? { _id: "extraction-1" }
              : { _id: "job-1", status: "processing" },
          );
        },
        delete: async (id: string) => {
          deleted.push(id);
        },
      },
      scheduler: {
        runAfter: async () => {
          dispatches += 1;
        },
      },
    };
    await cancelFileExtraction(ctx as never, "file-1" as never);
    expect(deleted).toEqual(["extraction-1"]);
    expect(dispatches).toBe(0);
  });
});

describe("file extraction authorization", () => {
  const file = uploadedFile();
  const site = { _id: file.siteId, organizationId: "organization-1" };

  test("status rejects unauthenticated callers before exposing failures", async () => {
    const ctx = {
      db: {
        get: async (id: string) => (id === file._id ? file : site),
      },
      auth: { getUserIdentity: async () => null },
    };
    await expect(
      invoke(getStatus, ctx, { fileId: file._id }),
    ).rejects.toMatchObject({
      data: expect.objectContaining({ code: "UNAUTHENTICATED" }),
    });
  });

  test("retry rejects organization viewers without library management", async () => {
    const ctx = {
      db: {
        get: async (id: string) => (id === file._id ? file : site),
      },
      auth: {
        getUserIdentity: async () => ({ subject: "user-1" }),
      },
      runQuery: async () => ({
        _id: "member-1",
        organizationId: site.organizationId,
        role: "viewer",
        userId: "user-1",
      }),
    };
    await expect(
      invoke(retry, ctx, { fileId: file._id }),
    ).rejects.toMatchObject({
      data: expect.objectContaining({ code: "FORBIDDEN" }),
    });
  });
});
