import { describe, expect, test } from "bun:test";
import type { Id } from "@baseblocks/backend";
import type { OpenEditorDocument } from "@openeditor/document";
import { renderToStaticMarkup } from "react-dom/server";
import { useVersionedPageDocument } from "./use-versioned-page-document";

const remoteDocument = {
  document: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Ready on first render" }],
      },
    ],
  } as OpenEditorDocument,
  contentHash: "sha256:test",
};

function InitialDocumentHarness() {
  const { document } = useVersionedPageDocument({
    onError: () => undefined,
    pageId: "page-1" as Id<"pages">,
    remote: remoteDocument,
    save: async () => ({ ...remoteDocument, status: "saved" }),
  });

  return <output>{JSON.stringify(document)}</output>;
}

describe("versioned page document", () => {
  test("renders the authoritative document without an effect-driven loading frame", () => {
    expect(renderToStaticMarkup(<InitialDocumentHarness />)).toContain(
      "Ready on first render",
    );
  });
});
