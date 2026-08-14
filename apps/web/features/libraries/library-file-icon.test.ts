import { describe, expect, test } from "bun:test";
import { getLibraryFileIconKind } from "./library-file-icon";

describe("getLibraryFileIconKind", () => {
  test.each([
    ["report.pdf", "application/octet-stream", "pdf"],
    [
      "slides.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "presentation",
    ],
    [
      "data.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "spreadsheet",
    ],
    [
      "notes.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "document",
    ],
    ["readme.md", "text/markdown; charset=utf-8", "markdown"],
    ["data.csv", "text/csv", "csv"],
    ["photo.png", "image/png", "image"],
    ["clip.mp4", "video/mp4", "video"],
    ["song.mp3", "audio/mpeg", "audio"],
    ["source.ts", "text/plain", "code"],
    ["bundle.zip", "application/zip", "archive"],
    ["notes.txt", "text/plain", "text"],
    ["unknown.bin", "application/octet-stream", "file"],
  ] as const)("maps %s to %s", (filename, contentType, expected) => {
    expect(getLibraryFileIconKind(filename, contentType)).toBe(expected);
  });
});
