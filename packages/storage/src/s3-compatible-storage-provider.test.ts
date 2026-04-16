import { describe, expect, test } from "bun:test";
import { S3CompatibleStorageProvider } from "./s3-compatible-storage-provider";

const provider = new S3CompatibleStorageProvider({
  driver: "s3-compatible",
  provider: "railway",
  bucket: "bucket-name",
  endpoint: "https://storage.example.com",
  region: "auto",
  accessKeyId: "access-key",
  secretAccessKey: "secret-key",
  forcePathStyle: true,
  maxUploadSizeBytes: null,
});

describe("s3-compatible storage provider", () => {
  test("creates signed upload requests for direct browser uploads", async () => {
    const signedUpload = await provider.signUpload({
      objectKey: "sites/site_123/documents/2026/04/16/file.pdf",
      contentType: "application/pdf",
    });

    expect(signedUpload.method).toBe("PUT");
    expect(signedUpload.headers).toEqual({
      "Content-Type": "application/pdf",
    });
    expect(signedUpload.url).toContain(
      "https://storage.example.com/bucket-name/sites/site_123/documents/2026/04/16/file.pdf",
    );
    expect(signedUpload.url).toContain("X-Amz-Signature=");
  });
});
