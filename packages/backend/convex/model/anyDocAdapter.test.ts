import { expect, test } from "bun:test";
import { loadAnyDocNode } from "./anyDocAdapter";

test("AnyDoc Node boundary loads its platform binding", async () => {
  const anyDoc = await loadAnyDocNode();
  expect(anyDoc.formatFromExtension("pdf")).toBe("pdf");
  expect(anyDoc.toMarkdownBytes).toBeFunction();
});
