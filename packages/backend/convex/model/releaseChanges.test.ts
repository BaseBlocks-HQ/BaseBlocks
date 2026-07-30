import { describe, expect, test } from "bun:test";
import { diffReleaseEntities } from "./releaseChanges";

type Page = {
  _id: string;
  title: string;
  parentId?: string;
  contentHash: string;
};

describe("release entity diff", () => {
  const fields = [
    {
      name: "Moved",
      current: (page: Page) => page.parentId,
      released: (page: Page) => page.parentId,
      movement: true,
    },
    {
      name: "Content edited",
      current: (page: Page) => page.contentHash,
      released: (page: Page) => page.contentHash,
    },
  ];

  test("records additions and deletions without losing stable identity", () => {
    const changes = diffReleaseEntities({
      entityType: "page",
      current: [{ _id: "page-2", title: "New", contentHash: "b" }],
      released: [{ _id: "page-1", title: "Old", contentHash: "a" }],
      releasedId: (page) => page._id,
      label: (page) => page.title,
      fields,
    });

    expect(changes).toEqual([
      {
        entityType: "page",
        entityId: "page-2",
        changeType: "added",
        label: "New",
        details: ["Added"],
      },
      {
        entityType: "page",
        entityId: "page-1",
        changeType: "deleted",
        label: "Old",
        details: ["Deleted"],
      },
    ]);
  });

  test("distinguishes a move from a content update", () => {
    const moved = diffReleaseEntities({
      entityType: "page",
      current: [
        {
          _id: "page-1",
          title: "Page",
          parentId: "parent-2",
          contentHash: "same",
        },
      ],
      released: [
        {
          _id: "page-1",
          title: "Page",
          parentId: "parent-1",
          contentHash: "same",
        },
      ],
      releasedId: (page) => page._id,
      label: (page) => page.title,
      fields,
    });
    expect(moved[0]?.changeType).toBe("moved");

    const edited = diffReleaseEntities({
      entityType: "page",
      current: [{ _id: "page-1", title: "Page", contentHash: "new" }],
      released: [{ _id: "page-1", title: "Page", contentHash: "old" }],
      releasedId: (page) => page._id,
      label: (page) => page.title,
      fields,
    });
    expect(edited[0]).toMatchObject({
      changeType: "updated",
      details: ["Content edited"],
    });
  });

  test("does not emit a change for identical snapshots", () => {
    const page = { _id: "page-1", title: "Page", contentHash: "same" };
    expect(
      diffReleaseEntities({
        entityType: "page",
        current: [page],
        released: [page],
        releasedId: (value) => value._id,
        label: (value) => value.title,
        fields,
      }),
    ).toEqual([]);
  });
});
