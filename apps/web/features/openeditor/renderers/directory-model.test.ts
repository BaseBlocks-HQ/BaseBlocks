import { describe, expect, test } from "bun:test";
import type { Directory } from "@baseblocks/domain";
import {
  insertDirectoryColumn,
  insertDirectoryRow,
  pasteDirectoryColumn,
  pasteDirectoryRow,
  removeDirectoryColumn,
} from "./directory-model";

const directory: Directory = {
  id: "directory",
  label: "Directory",
  columnIds: ["column-1"],
  rows: [{ id: "row-1", cells: { "column-1": "original" } }],
  pageSize: null,
};

function sequentialIds() {
  let next = 1;
  return (kind: "column" | "row") => `${kind}-new-${next++}`;
}

describe("directory editing model", () => {
  test("inserts rows and columns without mutating the input", () => {
    const withRow = insertDirectoryRow(
      directory,
      "row-1",
      true,
      sequentialIds(),
    );
    const withColumn = insertDirectoryColumn(
      directory,
      "column-1",
      false,
      sequentialIds(),
    );

    expect(withRow.rows).toEqual([
      directory.rows[0],
      { id: "row-new-1", cells: { "column-1": "" } },
    ]);
    expect(withColumn.columnIds).toEqual(["column-new-1", "column-1"]);
    expect(withColumn.rows[0]?.cells).toEqual({
      "column-1": "original",
      "column-new-1": "",
    });
    expect(directory.columnIds).toEqual(["column-1"]);
  });

  test("expands the opposite axis when pasted data is larger", () => {
    const rowPaste = pasteDirectoryRow(
      directory,
      "row-1",
      ["one", "two"],
      sequentialIds(),
    );
    const columnPaste = pasteDirectoryColumn(
      directory,
      "column-1",
      ["one", "two"],
      sequentialIds(),
    );

    expect(rowPaste.columnIds).toEqual(["column-1", "column-new-1"]);
    expect(rowPaste.rows[0]?.cells).toEqual({
      "column-1": "one",
      "column-new-1": "two",
    });
    expect(columnPaste.rows).toEqual([
      { id: "row-1", cells: { "column-1": "one" } },
      { id: "row-new-1", cells: { "column-1": "two" } },
    ]);
  });

  test("removes column data from every row", () => {
    const result = removeDirectoryColumn(
      {
        ...directory,
        columnIds: ["column-1", "column-2"],
        rows: [
          {
            id: "row-1",
            cells: { "column-1": "one", "column-2": "two" },
          },
        ],
      },
      "column-1",
    );

    expect(result.columnIds).toEqual(["column-2"]);
    expect(result.rows[0]?.cells).toEqual({ "column-2": "two" });
  });
});
