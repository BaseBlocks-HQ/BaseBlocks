import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorRevealBoundary } from "./editor-reveal-boundary";

const themedEditor = <main data-site-theme="custom">Editor document</main>;

describe("editor reveal boundary", () => {
  test("keeps the themed editor unmounted while the snapshot loads", () => {
    const markup = renderToStaticMarkup(
      <EditorRevealBoundary state="loading">
        {themedEditor}
      </EditorRevealBoundary>,
    );

    expect(markup).not.toContain("data-site-theme");
    expect(markup).not.toContain("Editor document");
  });

  test("reveals the editor only for a ready snapshot", () => {
    expect(
      renderToStaticMarkup(
        <EditorRevealBoundary state="ready">
          {themedEditor}
        </EditorRevealBoundary>,
      ),
    ).toContain("Editor document");
  });
});
