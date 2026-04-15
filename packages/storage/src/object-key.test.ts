import { describe, expect, test } from "bun:test";
import { createObjectKey, toAttachmentContentDisposition } from "./object-key";

describe("storage object keys", () => {
  test("creates document keys under the site document prefix", () => {
    const key = createObjectKey({
      siteId: "site_123",
      purpose: "document",
      filename: "Quarterly Report (Final).pdf",
    });

    expect(key).toMatch(
      /^sites\/site_123\/documents\/\d{4}\/\d{2}\/\d{2}\/.+-Quarterly_Report__Final_.pdf$/,
    );
  });

  test("creates attachment content disposition with sanitized filenames", () => {
    expect(toAttachmentContentDisposition("ACME Q1 / Draft.pdf")).toBe(
      'attachment; filename="ACME_Q1___Draft.pdf"',
    );
  });
});
