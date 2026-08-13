import { describe, expect, test } from "bun:test";
import type { OpenEditorDocument } from "@openeditor/core";
import { baseBlocksCoreBlockManifests } from "./core-manifests";
import {
  hasSameNonPageContent,
  pageProjections,
  projectChildPages,
  reconcileChildPageProjection,
  removeChildPageProjection,
} from "./page-projection";

const manifests = [
  ...baseBlocksCoreBlockManifests,
  {
    id: "example.document-field",
    label: "Document field",
    version: 1,
    dataSchema: {
      type: "object" as const,
      properties: { nested: { type: "document" as const } },
      required: ["nested"],
      additionalProperties: false,
    },
  },
];
const document = (...content: OpenEditorDocument["content"]) =>
  ({ type: "doc", version: 1, content }) as OpenEditorDocument;
const paragraph = (text: string) => ({
  type: "paragraph",
  attrs: { "openeditor-id": `paragraph-${text}` },
  content: [{ type: "text", text }],
});
const page = (pageId: string) => ({
  type: "page",
  attrs: { "openeditor-id": `page-${pageId}`, pageId },
  content: [{ type: "text", text: pageId }],
});

describe("child page projection", () => {
  test("canonicalizes existing pages and appends missing children", () => {
    const projected = projectChildPages(
      document(paragraph("before"), page("a"), page("a"), page("stale")),
      [
        { pageId: "a", title: "Current A", icon: "📘" },
        { pageId: "b", title: "Current B" },
      ],
      manifests,
    );
    expect(projected.content[0]).toEqual(paragraph("before"));
    expect(pageProjections(projected, manifests)).toEqual([
      {
        pageId: "a",
        title: "Current A",
        icon: "📘",
        href: "?page=a",
      },
      {
        pageId: "b",
        title: "Current B",
        icon: "📄",
        href: "?page=b",
      },
    ]);
  });

  test("rebases only the authoritative page projection", () => {
    const local = document(paragraph("local"));
    const remote = projectChildPages(
      document(paragraph("remote")),
      [{ pageId: "child", title: "Child" }],
      manifests,
    );
    const rebased = reconcileChildPageProjection(local, remote, manifests);
    expect(rebased.content[0]).toEqual(paragraph("local"));
    expect(pageProjections(rebased, manifests)[0]?.pageId).toBe("child");
    expect(hasSameNonPageContent(local, rebased, manifests)).toBe(true);
  });

  test("uses the first Page Tabs document as the insertion target", () => {
    const tabs = {
      type: "customBlock",
      attrs: {
        "openeditor-id": "tabs",
        blockId: "baseblocks.page-tabs",
        version: 1,
        data: {
          tabs: [
            { id: "tab", label: "Tab", document: document(paragraph("tab")) },
          ],
        },
      },
    };
    const projected = projectChildPages(
      document(tabs),
      [{ pageId: "child", title: "Child" }],
      manifests,
    );
    expect(projected.content).toHaveLength(1);
    expect(pageProjections(projected, manifests)[0]?.pageId).toBe("child");
  });

  test("operates in any manifest-declared document field", () => {
    const input = document({
      type: "customBlock",
      attrs: {
        "openeditor-id": "field",
        blockId: "example.document-field",
        version: 1,
        data: { nested: document(page("child")) },
      },
    });
    expect(pageProjections(input, manifests)[0]?.pageId).toBe("child");
    const cleared = removeChildPageProjection(input, manifests);
    expect(cleared.content[0]?.attrs?.data).toMatchObject({
      nested: { content: [] },
    });
  });
});
