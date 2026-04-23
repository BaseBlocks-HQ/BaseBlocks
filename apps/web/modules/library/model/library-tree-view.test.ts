import { describe, expect, test } from "bun:test";
import type { LibraryEntity, LibraryFile, LibraryFolder } from "../types";
import {
  buildDraftFolderViewPath,
  buildLibraryTreeView,
  buildLibraryTreeViewPath,
  getLibraryTreeViewLookupPath,
  getLibraryTreeViewNameFromPath,
} from "./library-tree-view";

function folderEntity(id: string, name: string, path: string): LibraryEntity {
  return {
    kind: "folder",
    folder: {
      _id: id,
      _creationTime: 0,
      libraryId: "library",
      name,
      order: 0,
      parentId: undefined,
    } as LibraryFolder,
    name,
    path,
  };
}

function fileEntity(id: string, name: string, path: string): LibraryEntity {
  return {
    kind: "file",
    file: {
      _id: id,
      contentType: "text/plain",
      createdAt: 0,
      downloadUrl: `/files/${id}`,
      filename: name,
      folderId: undefined,
      size: 12,
    } as LibraryFile,
    name,
    path,
  };
}

describe("buildLibraryTreeView", () => {
  test("keeps canonical tree paths in tree mode", () => {
    const folder = folderEntity("folder-root", "src", "src");
    const file = fileEntity("file-entry", "index.ts", "src/index.ts");
    const entitiesByTreePath = new Map<string, LibraryEntity>([
      ["src/", folder],
      ["src/index.ts", file],
    ]);

    const view = buildLibraryTreeView({
      entitiesByTreePath,
      mode: "tree",
      treePaths: ["src/", "src/index.ts"],
    });

    expect(view.paths).toEqual(["src/", "src/index.ts"]);
    expect(view.entitiesByViewPath.get("src/")).toBe(folder);
  });

  test("builds flat root-level paths from canonical entities", () => {
    const folder = folderEntity(
      "folder-components",
      "components",
      "src/components",
    );
    const file = fileEntity(
      "file-avatar",
      "Avatar.tsx",
      "src/components/Avatar.tsx",
    );
    const entitiesByTreePath = new Map<string, LibraryEntity>([
      ["src/components/", folder],
      ["src/components/Avatar.tsx", file],
    ]);

    const view = buildLibraryTreeView({
      entitiesByTreePath,
      mode: "flat",
      treePaths: ["src/components/", "src/components/Avatar.tsx"],
    });

    expect(view.paths).toEqual([
      "src > components/",
      "src > components > Avatar.tsx",
    ]);
    expect(view.entitiesByViewPath.get("src > components/")).toBe(folder);
    expect(view.entitiesByViewPath.get("src > components > Avatar.tsx")).toBe(
      file,
    );
  });
});

describe("library tree view helpers", () => {
  test("builds a draft folder path in tree mode", () => {
    const draft = buildDraftFolderViewPath({
      existingViewPaths: ["src/", "src/Untitled folder/"],
      mode: "tree",
      parentActualPath: "src",
    });

    expect(draft.name).toBe("Untitled folder 2");
    expect(draft.actualPath).toBe("src/Untitled folder 2");
    expect(draft.viewPath).toBe("src/Untitled folder 2/");
  });

  test("builds a draft folder path in flat mode", () => {
    const draft = buildDraftFolderViewPath({
      existingViewPaths: [
        "src > components/",
        "src > components > Untitled folder/",
      ],
      mode: "flat",
      parentActualPath: "src/components",
    });

    expect(draft.name).toBe("Untitled folder 2");
    expect(draft.viewPath).toBe("src > components > Untitled folder 2/");
  });

  test("extracts the edited basename from flat and tree paths", () => {
    expect(
      getLibraryTreeViewNameFromPath("src/components/Button.tsx", "tree"),
    ).toBe("Button.tsx");
    expect(
      getLibraryTreeViewNameFromPath("src > components > Button.tsx", "flat"),
    ).toBe("Button.tsx");
  });

  test("normalizes folder lookup paths for rename events", () => {
    expect(getLibraryTreeViewLookupPath("src/components", true)).toBe(
      "src/components/",
    );
    expect(
      getLibraryTreeViewLookupPath("src > components > Button.tsx", false),
    ).toBe("src > components > Button.tsx");
  });

  test("builds view paths from actual entity paths", () => {
    expect(buildLibraryTreeViewPath("src/components", "folder", "flat")).toBe(
      "src > components/",
    );
    expect(
      buildLibraryTreeViewPath("src/components/Button.tsx", "file", "tree"),
    ).toBe("src/components/Button.tsx");
  });
});
