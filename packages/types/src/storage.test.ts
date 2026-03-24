import { describe, expect, test } from "bun:test";
import {
  isExtractableDocumentMimeType,
  isSupportedUploadMimeType,
  normalizeMimeType,
} from "./storage";

describe("storage mime helpers", () => {
  test("normalizeMimeType strips parameters and lowercases", () => {
    expect(normalizeMimeType("Text/HTML; charset=utf-8")).toBe("text/html");
  });

  test("supports modern office uploads", () => {
    expect(
      isSupportedUploadMimeType(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ),
    ).toBe(true);
    expect(isSupportedUploadMimeType("application/msword")).toBe(false);
  });

  test("extractable set covers modern office and text formats", () => {
    expect(
      isExtractableDocumentMimeType("application/vnd.oasis.opendocument.text"),
    ).toBe(true);
    expect(
      isExtractableDocumentMimeType(
        "application/vnd.ms-excel.sheet.macroEnabled.12",
      ),
    ).toBe(false);
  });
});
