import { describe, expect, test } from "bun:test";
import {
  buildDocumentSearchMetadata,
  normalizeDocumentSearchMetadata,
} from "./documentSearchMetadata";

describe("document search metadata", () => {
  test("builds canonical document download urls", () => {
    expect(
      buildDocumentSearchMetadata({
        documentId: "doc_123",
        assetId: "asset_123",
        filename: "report.pdf",
        contentType: "application/pdf",
        size: 42,
        libraryId: "library_123",
      }),
    ).toEqual({
      assetId: "asset_123",
      filename: "report.pdf",
      fileContentType: "application/pdf",
      size: 42,
      downloadUrl: "/api/storage/documents/doc_123",
      libraryId: "library_123",
    });
  });

  test("normalizes stale download urls without dropping metadata", () => {
    expect(
      normalizeDocumentSearchMetadata({
        sourceId: "doc_987",
        metadata: {
          filename: "legacy.pdf",
          fileContentType: "application/pdf",
          size: 7,
          downloadUrl: "/api/storage/download?path=legacy",
        },
      }),
    ).toEqual({
      filename: "legacy.pdf",
      fileContentType: "application/pdf",
      size: 7,
      downloadUrl: "/api/storage/documents/doc_987",
    });
  });
});
