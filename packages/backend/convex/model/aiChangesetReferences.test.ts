import { describe, expect, test } from "bun:test";
import {
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "../pageContentFormat";
import {
  planAiChangeset,
  type AiWorkspacePageSnapshot,
} from "./aiChangesetPlan";
import { assertAiChangesetReferences } from "./aiChangesetReferences";

const emptyDocument = parseOpenEditorDocument({
  type: "doc",
  version: 1,
  content: [
    { type: "paragraph", attrs: { "openeditor-id": "empty-paragraph" } },
  ],
});

function page(
  pageId: string,
  slug: string,
  order: number,
  parentId?: string,
  document: OpenEditorDocument = emptyDocument,
): AiWorkspacePageSnapshot {
  return {
    pageId,
    parentId,
    title: pageId,
    slug,
    order,
    contentHash: `${pageId}-hash`,
    document,
  };
}

function paragraphLink(href: string): OpenEditorDocument {
  return parseOpenEditorDocument({
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        attrs: { "openeditor-id": `paragraph-${href}` },
        content: [
          {
            type: "text",
            text: "Read",
            marks: [{ type: "link", attrs: { href } }],
          },
        ],
      },
    ],
  });
}

function quickLink(url: string): OpenEditorDocument {
  return parseOpenEditorDocument({
    type: "doc",
    version: 1,
    content: [
      {
        type: "baseblocksQuickLinks",
        attrs: {
          "openeditor-id": `quick-link-${url}`,
          links: [{ id: "link-1", title: "Read", url, linkType: "website" }],
        },
      },
    ],
  });
}

function createPlan(input: {
  pages: AiWorkspacePageSnapshot[];
  operations?: Parameters<typeof planAiChangeset>[0]["operations"];
  defaultPageRef?: string;
}) {
  const operations = input.operations ?? [
    { kind: "update" as const, pageId: "home", title: "Home" },
  ];
  return planAiChangeset({
    pages: input.pages,
    currentDefaultPageId: "home",
    expectedContentHashes: operations.flatMap((operation) =>
      operation.kind === "create"
        ? []
        : [
            {
              pageId: operation.pageId,
              contentHash:
                input.pages.find((value) => value.pageId === operation.pageId)
                  ?.contentHash ?? null,
            },
          ],
    ),
    operations,
    defaultPageRef: input.defaultPageRef,
  });
}

function validate(input: {
  pages: AiWorkspacePageSnapshot[];
  operations?: Parameters<typeof planAiChangeset>[0]["operations"];
  documents?: ReadonlyMap<string, OpenEditorDocument>;
  libraries?: Array<{ libraryId: string }>;
  files?: Array<{
    fileId: string;
    kind: "file" | "siteAsset";
    libraryId?: string;
  }>;
}) {
  const plan = createPlan({ pages: input.pages, operations: input.operations });
  assertAiChangesetReferences({
    plan,
    documents:
      input.documents ??
      new Map(
        plan.pages.map((value) => [
          value.ref,
          value.document as OpenEditorDocument,
        ]),
      ),
    libraries: input.libraries ?? [],
    files: input.files ?? [],
  });
}

describe("AI changeset semantic references", () => {
  test("accepts page, library, attachment and image IDs with the correct resource kinds", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "page",
          attrs: {
            pageId: "guide",
            icon: null,
            href: null,
            "openeditor-id": "page-link-guide",
          },
          content: [{ type: "text", text: "Guide" }],
        },
        {
          type: "baseblocksLibrary",
          attrs: {
            "openeditor-id": "library-1",
            library: { libraryId: "library-1", allowDownloads: true },
          },
        },
        {
          type: "attachment",
          attrs: {
            "openeditor-id": "attachment-1",
            attachmentId: "file-1",
            name: "Manual",
            mimeType: null,
            size: null,
            url: null,
          },
        },
        {
          type: "image",
          attrs: {
            "openeditor-id": "image-1",
            imageId: "asset-1",
            src: "/api/files/asset-1",
            alt: "",
            width: null,
            height: null,
          },
        },
      ],
    });
    validate({
      pages: [
        page("home", "home", 0, undefined, document),
        page("guide", "guide", 1),
      ],
      libraries: [{ libraryId: "library-1" }],
      files: [
        { fileId: "file-1", kind: "file" },
        { fileId: "asset-1", kind: "siteAsset" },
      ],
    });
  });

  test("rejects IDs used as the wrong resource type", () => {
    const document = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "image",
          attrs: {
            "openeditor-id": "image-1",
            imageId: "file-1",
            src: null,
            alt: "",
            width: null,
            height: null,
          },
        },
      ],
    });
    expect(() =>
      validate({
        pages: [page("home", "home", 0, undefined, document)],
        libraries: [{ libraryId: "library-1" }],
        files: [{ fileId: "file-1", kind: "file", libraryId: "library-1" }],
      }),
    ).toThrow("is not an available site asset");
  });

  test("validates unchanged relative links against the final graph after a move", () => {
    const pages = [
      page("home", "home", 0),
      page("guide", "guide", 1),
      page("intro", "intro", 0, "guide", paragraphLink("api")),
      page("api", "api", 1, "guide"),
      page("company", "company", 2),
    ];
    expect(() =>
      validate({
        pages,
        operations: [{ kind: "update", pageId: "intro", parentRef: "company" }],
      }),
    ).toThrow("resolves to missing site route /company/api");
  });

  test("rejects stale absolute quick links after a target slug rename", () => {
    const pages = [
      page("home", "home", 0, undefined, quickLink("/guide/api")),
      page("guide", "guide", 1),
      page("api", "api", 0, "guide"),
    ];
    expect(() =>
      validate({
        pages,
        operations: [{ kind: "update", pageId: "api", slug: "reference" }],
      }),
    ).toThrow("resolves to missing site route /guide/api");
  });

  test("accepts links rewritten for the final route graph during a restructure", () => {
    const pages = [
      page("home", "home", 0, undefined, quickLink("/guide/api")),
      page("guide", "guide", 1),
      page("api", "api", 0, "guide"),
    ];
    const updatedHome = quickLink("/guide/reference");
    validate({
      pages,
      operations: [
        { kind: "update", pageId: "api", slug: "reference" },
        { kind: "update", pageId: "home", content: updatedHome },
      ],
      documents: new Map([
        ["home", updatedHome],
        ["guide", emptyDocument],
        ["api", emptyDocument],
      ]),
    });
  });

  test("rejects deleted page identities and unsafe external link protocols", () => {
    const pageReference = parseOpenEditorDocument({
      type: "doc",
      version: 1,
      content: [
        {
          type: "page",
          attrs: {
            pageId: "guide",
            icon: null,
            href: null,
            "openeditor-id": "page-link-guide",
          },
          content: [{ type: "text", text: "Guide" }],
        },
      ],
    });
    expect(() =>
      validate({
        pages: [
          page("home", "home", 0, undefined, pageReference),
          page("guide", "guide", 1),
        ],
        operations: [{ kind: "delete", pageId: "guide" }],
      }),
    ).toThrow("links to missing page guide");

    expect(() =>
      validate({
        pages: [
          page(
            "home",
            "home",
            0,
            undefined,
            paragraphLink("javascript:alert(1)"),
          ),
        ],
      }),
    ).toThrow("unsafe external link");
  });
});
