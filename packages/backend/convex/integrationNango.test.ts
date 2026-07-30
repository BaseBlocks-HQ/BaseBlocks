import { describe, expect, test } from "bun:test";
import { normalizeNangoContentResource } from "./integrationNango";

describe("normalizeNangoContentResource", () => {
  test("maps provider metadata into the BaseBlocks resource envelope", () => {
    expect(
      normalizeNangoContentResource({
        id: "page-1",
        object_type: "page",
        title: "  Architecture  ",
        url: "https://notion.so/page-1",
        parent_id: "page-root",
        created_time: "2026-01-01T00:00:00.000Z",
        last_edited_time: "2026-07-30T10:00:00.000Z",
        _nango_metadata: {
          cursor: "cursor-1",
          last_action: "UPDATED",
        },
      }),
    ).toEqual({
      externalId: "page-1",
      resourceType: "page",
      title: "Architecture",
      url: "https://notion.so/page-1",
      parentExternalId: "page-root",
      providerCreatedAt: "2026-01-01T00:00:00.000Z",
      providerUpdatedAt: "2026-07-30T10:00:00.000Z",
      deleted: false,
    });
  });

  test("uses a stable fallback title and preserves deletions", () => {
    expect(
      normalizeNangoContentResource({
        id: "page-2",
        object_type: "page",
        title: " ",
        _nango_metadata: {
          deleted_at: "2026-07-30T11:00:00.000Z",
          last_action: "DELETED",
        },
      }),
    ).toMatchObject({
      externalId: "page-2",
      title: "Untitled",
      deleted: true,
    });
  });
});
