import { describe, expect, test } from "bun:test";
import { readContentRevisionSearchText } from "./contentObjects";

describe("content revision search text", () => {
  test("rebuilds missing search text for revisions written before the field existed", async () => {
    const revision = {
      _id: "revision-1",
      payloadId: "payload-1",
      searchText: undefined,
    };
    const payload = {
      _id: "payload-1",
      content: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            attrs: { "openeditor-id": "paragraph-1" },
            content: [{ type: "text", text: "Legacy searchable content" }],
          },
        ],
      },
    };

    const result = await readContentRevisionSearchText(
      {
        db: {
          get: async (id: string) =>
            id === revision._id
              ? revision
              : id === payload._id
                ? payload
                : null,
        },
      } as never,
      revision._id as never,
    );

    expect(result).toContain("Legacy searchable content");
  });
});
