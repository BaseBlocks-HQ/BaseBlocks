import { describe, expect, test } from "bun:test";
import type { LibraryFile, LibraryFolder } from "../types";
import { buildLibraryEntityMap, getFolderPath } from "./library-paths";

function folder(
  id: string,
  name: string,
  parentId?: string,
  order = 0,
): LibraryFolder {
  return {
    _id: id,
    _creationTime: 0,
    libraryId: "library",
    name,
    order,
    parentId,
  } as LibraryFolder;
}

function file(id: string, filename: string, folderId?: string): LibraryFile {
  return {
    _id: id,
    contentType: "text/plain",
    createdAt: 0,
    downloadUrl: `/files/${id}`,
    filename,
    folderId,
    size: 12,
  } as LibraryFile;
}

describe("buildLibraryEntityMap", () => {
  test("builds stable nested paths for folders and files", () => {
    const root = folder("folder-root", "Root");
    const child = folder("folder-child", "Specs", root._id);
    const rootFile = file("file-readme", "readme.txt");
    const childFile = file("file-notes", "notes.txt", child._id);

    const model = buildLibraryEntityMap([child, root], [childFile, rootFile]);

    expect(model.paths).toEqual([
      "Root",
      "Root/Specs",
      "Root/Specs/notes.txt",
      "readme.txt",
    ]);
    expect(model.treePaths).toEqual([
      "Root/",
      "Root/Specs/",
      "Root/Specs/notes.txt",
      "readme.txt",
    ]);
    expect(model.entities.get("Root/Specs")?.kind).toBe("folder");
    expect(model.entitiesByTreePath.get("Root/Specs/")?.kind).toBe("folder");
    expect(model.entities.get("Root/Specs/notes.txt")?.kind).toBe("file");
  });

  test("keeps duplicate sibling names addressable", () => {
    const first = file("document-111111", "same.pdf");
    const second = file("document-222222", "same.pdf");

    const model = buildLibraryEntityMap([], [first, second]);

    expect(model.paths).toEqual(["same.pdf", "same.pdf (222222)"]);
  });
});

describe("getFolderPath", () => {
  test("returns ancestors from root to selected folder", () => {
    const root = folder("root", "Root");
    const child = folder("child", "Child", root._id);
    const foldersById = new Map([
      [root._id, root],
      [child._id, child],
    ]);

    expect(
      getFolderPath(child._id, foldersById).map((item) => item.name),
    ).toEqual(["Root", "Child"]);
  });

  test("stops when a parent cycle is encountered", () => {
    const first = folder("first", "First", "second");
    const second = folder("second", "Second", "first");
    const foldersById = new Map([
      [first._id, first],
      [second._id, second],
    ]);

    expect(
      getFolderPath(first._id, foldersById).map((item) => item._id),
    ).toEqual(["second", "first"]);
  });
});
