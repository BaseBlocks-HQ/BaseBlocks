import { describe, expect, test } from "bun:test";
import { migrateDirectoryDocument } from "./contentMigrations";

describe("directory content migration", () => {
  test("rewrites version 1 directory data into the version 2 envelope", () => {
    const migrated = migrateDirectoryDocument(
      JSON.stringify({
        type: "doc",
        version: 1,
        content: [
          {
            type: "customBlock",
            attrs: {
              "openeditor-id": "directory-legacy-1",
              blockId: "baseblocks.directory",
              version: 1,
              data: {
                directories: [
                  {
                    id: "directory",
                    label: "Directory",
                    columnIds: ["name"],
                    rows: [{ id: "row", cells: { name: "Ada" } }],
                    pageSize: null,
                  },
                ],
              },
            },
          },
        ],
      }),
    );

    expect(migrated?.migratedCount).toBe(1);
    expect(JSON.parse(migrated?.content ?? "null")).toMatchObject({
      content: [
        {
          attrs: {
            blockId: "baseblocks.directory",
            version: 2,
            data: {
              directories: [
                {
                  columns: [{ id: "name", name: "Column 1" }],
                  rows: [{ id: "row", cells: { name: "Ada" } }],
                },
              ],
            },
          },
        },
      ],
    });
  });
});
