import { describe, expect, test } from "bun:test";
import { roleHasPermission } from "../authComponent/permissions";
import {
  AiChangesetValidationError,
  assertAiWorkspaceRevision,
  planAiChangeset,
  type AiWorkspacePageSnapshot,
} from "./aiChangesetPlan";

const document = { type: "doc", version: 1, content: [] };

function page(
  pageId: string,
  input: Partial<AiWorkspacePageSnapshot> = {},
): AiWorkspacePageSnapshot {
  return {
    pageId,
    title: pageId,
    slug: pageId,
    order: 0,
    contentHash: `${pageId}-hash`,
    document,
    ...input,
  };
}

function plan(overrides: Partial<Parameters<typeof planAiChangeset>[0]> = {}) {
  return planAiChangeset({
    pages: [page("home")],
    currentDefaultPageId: "home",
    expectedContentHashes: [{ pageId: "home", contentHash: "home-hash" }],
    operations: [{ kind: "update", pageId: "home", title: "Welcome" }],
    ...overrides,
  });
}

describe("AI changeset authorization contract", () => {
  test("only content editors may export or apply workspaces", () => {
    const permission = { resource: "content", action: "edit" } as const;
    expect(roleHasPermission("owner", permission)).toBe(true);
    expect(roleHasPermission("admin", permission)).toBe(true);
    expect(roleHasPermission("editor", permission)).toBe(true);
    expect(roleHasPermission("viewer", permission)).toBe(false);
  });
});

describe("planAiChangeset", () => {
  test("rejects a stale site draft revision", () => {
    expect(() => assertAiWorkspaceRevision(8, 7)).toThrow(
      "site draft changed after the AI workspace was exported",
    );
    expect(() => assertAiWorkspaceRevision(8, 8)).not.toThrow();
  });

  test("applies create, update, move, rename, delete and default changes", () => {
    const result = plan({
      pages: [
        page("home", { order: 0 }),
        page("old", { order: 1, slug: "old" }),
      ],
      expectedContentHashes: [
        { pageId: "home", contentHash: "home-hash" },
        { pageId: "old", contentHash: "old-hash" },
      ],
      operations: [
        {
          kind: "update",
          pageId: "home",
          title: "Start",
          slug: "start",
          parentRef: "guide",
          order: 0,
        },
        { kind: "delete", pageId: "old" },
        {
          kind: "create",
          clientId: "guide",
          title: "Guide",
          slug: "guide",
          order: 0,
          content: document,
        },
      ],
      defaultPageRef: "guide",
    });

    expect(result.defaultPageRef).toBe("guide");
    expect(result.deletedPageIds).toEqual(["old"]);
    expect(result.pages.find((value) => value.ref === "home")).toMatchObject({
      title: "Start",
      slug: "start",
      parentId: "guide",
    });
  });

  test("permits a project-only rename or default-page changeset", () => {
    const result = plan({
      expectedContentHashes: [],
      operations: [],
      allowProjectOnlyChange: true,
    });
    expect(result.pages).toHaveLength(1);
    expect(result.touchedExistingPageIds).toEqual([]);
  });

  test("rejects stale site page hashes", () => {
    expect(() =>
      plan({
        expectedContentHashes: [{ pageId: "home", contentHash: "stale-hash" }],
      }),
    ).toThrow("changed after the workspace was exported");
  });

  test("requires a precondition for every touched existing page", () => {
    expect(() => plan({ expectedContentHashes: [] })).toThrow(
      "Missing content hash precondition",
    );
  });

  test("rejects cycles before producing a write plan", () => {
    expect(() =>
      plan({
        pages: [page("home", { order: 0 }), page("guide", { order: 1 })],
        expectedContentHashes: [
          { pageId: "home", contentHash: "home-hash" },
          { pageId: "guide", contentHash: "guide-hash" },
        ],
        operations: [
          { kind: "update", pageId: "home", parentRef: "guide" },
          { kind: "update", pageId: "guide", parentRef: "home" },
        ],
      }),
    ).toThrow("contains a cycle");
  });

  test("rejects global slug collisions", () => {
    expect(() =>
      plan({
        pages: [page("home", { order: 0 }), page("guide", { order: 1 })],
        expectedContentHashes: [{ pageId: "guide", contentHash: "guide-hash" }],
        operations: [{ kind: "update", pageId: "guide", slug: "home" }],
      }),
    ).toThrow("use the same slug");
  });

  test("rejects deletion of the default page without a replacement", () => {
    expect(() =>
      plan({
        operations: [{ kind: "delete", pageId: "home" }],
      }),
    ).toThrow("at least one page");
  });

  test("rejects a missing default page when other pages remain", () => {
    expect(() =>
      plan({
        pages: [page("home", { order: 0 }), page("guide", { order: 1 })],
        operations: [{ kind: "delete", pageId: "home" }],
      }),
    ).toThrow("default page must reference an active page");
  });

  test("validation is all-or-nothing and does not mutate its snapshot", () => {
    const pages = [
      page("home", { title: "Home", order: 0 }),
      page("guide", { title: "Guide", order: 1 }),
    ];
    const before = structuredClone(pages);

    expect(() =>
      plan({
        pages,
        expectedContentHashes: [
          { pageId: "home", contentHash: "home-hash" },
          { pageId: "guide", contentHash: "guide-hash" },
        ],
        operations: [
          { kind: "update", pageId: "home", title: "Changed" },
          { kind: "update", pageId: "guide", slug: "home" },
        ],
      }),
    ).toThrow(AiChangesetValidationError);
    expect(pages).toEqual(before);
  });

  test("enforces field lengths before producing a plan", () => {
    expect(() =>
      plan({
        operations: [
          { kind: "update", pageId: "home", title: "x".repeat(201) },
        ],
      }),
    ).toThrow("title exceeds the 200 character limit");
    expect(() =>
      plan({
        operations: [{ kind: "update", pageId: "home", icon: "x".repeat(501) }],
      }),
    ).toThrow("icon exceeds the 500 character limit");
  });

  test("enforces final site page capacity", () => {
    expect(() =>
      plan({
        pages: Array.from({ length: 500 }, (_, index) =>
          page(`page-${index}`, {
            slug: `page-${index}`,
            order: index,
          }),
        ),
        currentDefaultPageId: "page-0",
        expectedContentHashes: [],
        operations: [
          {
            kind: "create",
            clientId: "overflow",
            title: "Overflow",
            slug: "overflow",
            order: 500,
            content: document,
          },
        ],
      }),
    ).toThrow("500 page capacity");
  });
});
