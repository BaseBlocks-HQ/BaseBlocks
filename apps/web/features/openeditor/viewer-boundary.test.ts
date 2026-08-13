import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("published custom-block Viewer boundary", () => {
  test("installed Viewer subpaths have no transitive editor or Tiptap edge", () => {
    const packageRoot = resolve(
      import.meta.dir,
      "../../node_modules/@openeditor",
    );
    const graph = [
      ["ui", "dist/viewer.js"],
      ["react", "dist/viewer.js"],
      ["react", "dist/theme.js"],
      ["custom-block", "dist/viewer.js"],
    ]
      .map(([name, file]) =>
        readFileSync(resolve(packageRoot, name!, file!), "utf8"),
      )
      .join("\n");
    expect(graph).not.toMatch(/from ["']@openeditor\/react["']/);
    expect(graph).not.toContain("@openeditor/custom-block/editor");
    expect(graph).not.toContain("@openeditor/embedded-runtime");
    expect(graph).not.toContain("@openeditor/tiptap");
    expect(graph).not.toContain("@tiptap/");
  });
});
