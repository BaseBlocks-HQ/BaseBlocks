import { describe, expect, test } from "bun:test";
import { readContentRevisionSearchText } from "./contentObjects";

describe("content revision search text", () => {
  test("reads the captured search text from a content revision", async () => {
    const revision = {
      _id: "revision-1",
      searchText: "Captured searchable content",
    };

    const result = await readContentRevisionSearchText(
      {
        db: {
          get: async (id: string) => (id === revision._id ? revision : null),
        },
      } as never,
      revision._id as never,
    );

    expect(result).toBe("Captured searchable content");
  });
});
