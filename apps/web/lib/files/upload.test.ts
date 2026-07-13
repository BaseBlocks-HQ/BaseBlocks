import { describe, expect, mock, test } from "bun:test";
import type { FilesClient } from "files-sdk/client";
import { createUploadClient } from "./upload";

describe("filesClient.uploadAndRegister", () => {
  test("cleans up the completed object when registration fails", async () => {
    const upload = mock(async () => ({
      key: "guide.pdf",
      type: "application/pdf",
      lastModified: 0,
      etag: "checksum",
      size: 3,
    }));
    const remove = mock(async () => undefined);
    const client = createUploadClient((file) => ({
      client: {
        upload: upload as unknown as FilesClient["upload"],
        delete: remove as unknown as FilesClient["delete"],
      },
      file,
      keyPrefix: "sites/site-1/documents/file-id/",
    }));

    await expect(
      client.uploadAndRegister(
        new File(["pdf"], "guide.pdf", { type: "application/pdf" }),
        { siteId: "site-1", purpose: "document" },
        () => Promise.reject(new Error("Registration failed")),
      ),
    ).rejects.toThrow("Registration failed");

    expect(upload).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("guide.pdf");
  });
});
