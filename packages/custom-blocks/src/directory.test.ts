import { describe, expect, test } from "bun:test";
import {
  addDirectory,
  createDirectory,
  deleteDirectoryColumns,
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
  renameDirectoryColumn,
  reorderDirectories,
  filterDirectoryRows,
  parseDirectoryContent,
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

  test("parses the optional block width and rejects invalid values", () => {
    expect(parseDirectoryContent(content).width).toBeUndefined();
    expect(parseDirectoryContent({ ...content, width: "full" }).width).toBe(
      "full",
    );
    expect(() =>
      parseDirectoryContent({ ...content, width: "wide" } as DirectoryContent),
    ).toThrow();
  });

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
      columns: [{ id: "name-copy", name: "Name" }],
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
    columns: [
      { id: "c1", name: "Name" },
      { id: "c2", name: "Details" },
    ],
    rows: [{ id: "r1", cells: { c1: "A", c2: "B" } }],
  };

  test("inserts rows and columns with aligned cells", () => {
    const row = insertDirectoryRow(base, "r1", true, sequence("r2"));
    expect(row.rows[1]).toEqual({ id: "r2", cells: { c1: "", c2: "" } });
    const column = insertDirectoryColumn(row, "c1", true, sequence("c3"));
    expect(column.columns).toEqual([
      { id: "c1", name: "Name" },
      { id: "c3", name: "New column" },
      { id: "c2", name: "Details" },
    ]);
    expect(column.rows.every(({ cells }) => cells.c3 === "")).toBe(true);
  });

  test("paste expands the grid and preserves existing cells", () => {
    const rowPaste = pasteDirectoryRow(
      base,
      "r1",
      ["A2", "B2", "C2"],
      sequence("c3"),
    );
    expect(rowPaste.columns).toEqual([
      { id: "c1", name: "Name" },
      { id: "c2", name: "Details" },
      { id: "c3", name: "New column" },
    ]);
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
    expect(column.columns.map(({ id }) => id)).toEqual(["c1", "c3", "c2"]);
    expect(column.columns[1]?.name).toBe("Name copy");
    expect(column.rows[0]?.cells.c3).toBe("A");
  });

  test("renames columns and accepts unnamed persisted columns", () => {
    const renamed = renameDirectoryColumn(base, "c2", "Email");
    expect(renamed.columns[1]?.name).toBe("Email");
    expect(renameDirectoryColumn(base, "c2", " ").columns[1]?.name).toBe("");
    expect(
      parseDirectoryContent({
        directories: [
          {
            ...base,
            columns: [
              { id: "c1", name: " " },
              { id: "c2", name: "Email" },
            ],
          },
        ],
      }).directories[0]?.columns,
    ).toEqual([
      { id: "c1", name: "" },
      { id: "c2", name: "Email" },
    ]);
  });

  test("filters rows by any cell and preserves the minimum column", () => {
    expect(filterDirectoryRows(base, "b")).toEqual(base.rows);
    expect(filterDirectoryRows(base, "missing")).toEqual([]);
    expect(deleteDirectoryColumns(base, ["c1", "c2"]).columns).toEqual([
      { id: "c1", name: "Name" },
    ]);
    expect(deleteDirectoryColumns(base, ["c2"]).columns).toEqual([
      { id: "c1", name: "Name" },
    ]);
  });
});

test("reorders directories by stable IDs", () => {
  const content: DirectoryContent = {
    directories: [
      createDirectory("one", "One", "one-column", "one-row"),
      createDirectory("two", "Two", "two-column", "two-row"),
      createDirectory("three", "Three", "three-column", "three-row"),
    ],
  };
  expect(
    reorderDirectories(content, "three", "one").directories.map(({ id }) => id),
  ).toEqual(["three", "one", "two"]);
});
