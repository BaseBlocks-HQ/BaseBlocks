import { describe, expect, test } from "bun:test";
import type { LibraryEntity, LibraryFile, LibraryFolder } from "../types";
import { searchLibraryEntities } from "./library-search";

function entity(kind: "file" | "folder", path: string): LibraryEntity {
  const name = path.split("/").at(-1) ?? path;

  if (kind === "folder") {
    return {
      kind,
      folder: { _id: path, name } as LibraryFolder,
      name,
      path,
    };
  }

  return {
    kind,
    file: {
      _id: path,
      contentType: "text/plain",
      filename: name,
    } as LibraryFile,
    name,
    path,
  };
}

describe("searchLibraryEntities", () => {
  test("ranks exact and prefix matches before path-only matches", () => {
    const results = searchLibraryEntities("report", [
      entity("file", "Archive/old-report.pdf"),
      entity("file", "report.pdf"),
      entity("folder", "Reports"),
    ]);

    expect(results.map((result) => result.path)).toEqual([
      "report.pdf",
      "Reports",
      "Archive/old-report.pdf",
    ]);
  });

  test("returns no results for blank queries", () => {
    expect(
      searchLibraryEntities("   ", [entity("file", "report.pdf")]),
    ).toEqual([]);
  });
});
