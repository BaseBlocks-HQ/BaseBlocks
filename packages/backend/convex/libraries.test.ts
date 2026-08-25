import { describe, expect, test } from "bun:test";
import { buildExplorerPayload } from "./libraries";

describe("library explorer", () => {
  test("includes extraction state and failure details for files", async () => {
    const file = {
      _id: "file-1",
      filename: "manual.pdf",
      contentType: "application/pdf",
      size: 42,
      libraryId: "library-1",
      folderId: undefined,
      order: 0,
      deletedAt: undefined,
    };
    const ctx = {
      db: {
        query: (table: string) => ({
          withIndex: () => ({
            collect: async () =>
              table === "files"
                ? [file]
                : table === "fileExtractions"
                  ? [
                      {
                        fileId: file._id,
                        status: "failed",
                        failure: { message: "Document could not be read" },
                      },
                    ]
                  : [],
          }),
        }),
      },
    };

    const result = await buildExplorerPayload(
      ctx as never,
      { _id: "library-1", name: "Documents", siteId: "site-1" } as never,
      {
        _id: "site-1",
        name: "Site",
        organizationId: "organization-1",
      } as never,
    );

    expect(result.files).toEqual([
      expect.objectContaining({
        _id: "file-1",
        extractionStatus: "failed",
        extractionFailure: "Document could not be read",
      }),
    ]);
  });
});
