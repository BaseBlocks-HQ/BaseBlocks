import { describe, expect, test } from "bun:test";
import type { OpenEditorDocument } from "@openeditor/document";
import {
  hasSameChildPageProjection,
  hasSameNonPageContent,
  pageProjections,
  projectChildPages,
  reconcileChildPageProjection,
} from "./page-projection";

const document = (
  ...content: OpenEditorDocument["content"]
): OpenEditorDocument =>
  ({ type: "doc", version: 1, content }) as OpenEditorDocument;

const paragraph = (text: string) => ({
  type: "paragraph",
  attrs: { "openeditor-id": `paragraph-${text}` },
  content: [{ type: "text", text }],
});

describe("child page projection", () => {
  test("preserves content and existing positions while canonicalizing pages", () => {
    const projected = projectChildPages(
      document(
        paragraph("before"),
        {
          type: "page",
          attrs: {
            "openeditor-id": "old-id",
            pageId: "child-a",
            icon: "❌",
            href: "/old",
          },
          content: [{ type: "text", text: "Old title" }],
        },
        paragraph("after"),
      ),
      [{ pageId: "child-a", title: "Current title", icon: "📘" }],
    );

    expect(projected.content[0]).toEqual(paragraph("before"));
    expect(projected.content[2]).toEqual(paragraph("after"));
    expect(pageProjections(projected)).toEqual([
      {
        pageId: "child-a",
        title: "Current title",
        icon: "📘",
        href: "?page=child-a",
      },
    ]);
  });

  test("removes stale and duplicate nodes and appends missing children", () => {
    const page = (pageId: string) => ({
      type: "page",
      attrs: { "openeditor-id": pageId, pageId },
      content: [{ type: "text", text: pageId }],
    });
    const projected = projectChildPages(
      document(page("child-a"), page("child-a"), page("stale")),
      [
        { pageId: "child-a", title: "A" },
        { pageId: "child-b", title: "B" },
      ],
    );

    expect(pageProjections(projected).map((page) => page.pageId)).toEqual([
      "child-a",
      "child-b",
    ]);
  });

  test("rebases only the authoritative child-page projection", () => {
    const local = document(paragraph("unsaved local text"));
    const remote = projectChildPages(document(paragraph("server text")), [
      { pageId: "child", title: "Child" },
    ]);
    const rebased = reconcileChildPageProjection(local, remote);

    expect(rebased.content[0]).toEqual(paragraph("unsaved local text"));
    expect(pageProjections(rebased).map((page) => page.pageId)).toEqual([
      "child",
    ]);
    expect(hasSameChildPageProjection(rebased, remote)).toBe(true);
    expect(hasSameNonPageContent(local, rebased)).toBe(true);
    expect(hasSameNonPageContent(remote, rebased)).toBe(false);
  });
});
