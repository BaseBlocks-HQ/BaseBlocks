import { describe, expect, test } from "bun:test";
import {
  addDirectory,
  createDirectory,
  deleteDirectory,
  deleteDirectoryRow,
  duplicateDirectory,
  duplicateDirectoryColumn,
  duplicateDirectoryRow,
  insertDirectoryColumn,
  insertDirectoryRow,
  moveDirectoryItem,
  pasteDirectoryColumn,
  pasteDirectoryRow,
  renameDirectory,
  type DirectoryContent,
} from "./directory";

const sequence = (...ids: string[]) => {
  let index = 0;
  return () => ids[index++] ?? `generated-${index}`;
};

describe("directory collections", () => {
  const first = createDirectory("one", "People", "name", "r1");
  first.rows[0]!.cells.name = "Ada";
  const content: DirectoryContent = { directories: [first] };

  test("creates, renames, duplicates, switches to, and deletes directories", () => {
    const added = addDirectory(content, sequence("two", "role", "r2"));
    expect(added.activeId).toBe("two");
    expect(added.content.directories.map(({ label }) => label)).toEqual([
      "People",
      "Directory 2",
    ]);

    const renamed = renameDirectory(added.content, "two", "Teams");
    const duplicated = duplicateDirectory(
      renamed,
      "one",
      sequence("name-copy", "one-copy", "r1-copy"),
    );
    expect(duplicated.activeId).toBe("one-copy");
    expect(duplicated.content.directories.at(-1)).toMatchObject({
      label: "People copy",
      columnIds: ["name-copy"],
      rows: [{ id: "r1-copy", cells: { "name-copy": "Ada" } }],
    });
    expect(deleteDirectory(duplicated.content, "one-copy").activeId).toBe(
      "two",
    );
  });
});

describe("directory grid operations", () => {
  const base = {
    ...createDirectory("one", "Grid", "c1", "r1"),
    columnIds: ["c1", "c2"],
    rows: [{ id: "r1", cells: { c1: "A", c2: "B" } }],
  };

  test("inserts rows and columns with aligned cells", () => {
    const row = insertDirectoryRow(base, "r1", true, sequence("r2"));
    expect(row.rows[1]).toEqual({ id: "r2", cells: { c1: "", c2: "" } });
    const column = insertDirectoryColumn(row, "c1", true, sequence("c3"));
    expect(column.columnIds).toEqual(["c1", "c3", "c2"]);
    expect(column.rows.every(({ cells }) => cells.c3 === "")).toBe(true);
  });

  test("paste expands the grid and preserves existing cells", () => {
    const rowPaste = pasteDirectoryRow(
      base,
      "r1",
      ["A2", "B2", "C2"],
      sequence("c3"),
    );
    expect(rowPaste.columnIds).toEqual(["c1", "c2", "c3"]);
    expect(rowPaste.rows[0]?.cells).toEqual({ c1: "A2", c2: "B2", c3: "C2" });

    const columnPaste = pasteDirectoryColumn(
      base,
      "c2",
      ["B2", "B3"],
      sequence("r2"),
    );
    expect(columnPaste.rows).toEqual([
      { id: "r1", cells: { c1: "A", c2: "B2" } },
      { id: "r2", cells: { c1: "", c2: "B3" } },
    ]);
  });

  test("reorders, duplicates, and deletes without losing cell alignment", () => {
    expect(moveDirectoryItem(["c1", "c2", "c3"], "c3", "c1")).toEqual([
      "c3",
      "c1",
      "c2",
    ]);
    const row = duplicateDirectoryRow(base, "r1", sequence("r2"));
    expect(row.rows[1]).toEqual({ id: "r2", cells: { c1: "A", c2: "B" } });
    expect(deleteDirectoryRow(row, "r1").rows).toEqual([row.rows[1]]);
    const column = duplicateDirectoryColumn(base, "c1", sequence("c3"));
    expect(column.columnIds).toEqual(["c1", "c3", "c2"]);
    expect(column.rows[0]?.cells.c3).toBe("A");
  });
});
