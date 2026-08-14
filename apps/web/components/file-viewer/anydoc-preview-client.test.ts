import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const component = readFileSync(
  new URL("./anydoc-preview-client.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

describe("AnyDoc preview style isolation", () => {
  test("keeps OpenEditor prose colors out of DOCX pages", () => {
    expect(component).toContain("baseblocks-anydoc-preview");
    expect(styles).toMatch(
      /\.baseblocks-anydoc-preview[^{]*\.anydoc-docx[^{]*:where\(p, ul, ol\)\s*\{[^}]*color:\s*inherit/su,
    );
  });
});
