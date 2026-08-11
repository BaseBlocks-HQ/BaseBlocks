import { describe, expect, test } from "bun:test";
import { createBaseBlocksImageResolver } from "./image-runtime";

describe("BaseBlocks OpenEditor image resolver", () => {
  test("turns an authorized site asset into a trusted editor preview", async () => {
    const resolveImage = createBaseBlocksImageResolver(async () => ({
      imageId: "asset-1",
      url: "/api/files/asset-1",
    }));

    await expect(resolveImage("asset-1")).resolves.toEqual({
      imageId: "asset-1",
      src: "/api/files/asset-1",
      alt: "",
      width: null,
      height: null,
    });
  });

  test("does not query storage after resolution is cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    const resolveImage = createBaseBlocksImageResolver(async () => {
      calls += 1;
      return null;
    });

    await expect(
      resolveImage("asset-1", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toBe(0);
  });
});
