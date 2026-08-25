import { describe, expect, test } from "bun:test";
import { cancelFileExtraction, fileIngestion } from "./fileExtraction";

describe("file deletion", () => {
  test("deletes the extraction row when queue cancellation fails", async () => {
    const extraction = {
      _id: "extraction-1",
      fileId: "file-1",
      sourceVersion: "source-1",
      generation: 1,
      idempotencyKey: "file-1:1:source-1",
      workId: "work-1",
      status: "processing",
    };
    let deleted = false;
    const originalCancel = fileIngestion.cancel;
    fileIngestion.cancel = async () => {
      throw new Error("queue cancellation failed");
    };

    try {
      await cancelFileExtraction(
        {
          db: {
            query: () => ({
              withIndex: () => ({ unique: async () => extraction }),
            }),
            delete: async () => {
              deleted = true;
            },
          },
        } as never,
        "file-1" as never,
      );
    } finally {
      fileIngestion.cancel = originalCancel;
    }

    expect(deleted).toBeTrue();
  });
});
