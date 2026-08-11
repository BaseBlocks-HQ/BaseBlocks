import { describe, expect, test } from "bun:test";
import { createPublishedImageRuntime } from "./image-runtime";

describe("published OpenEditor image runtime", () => {
  test("resolves only image IDs included in the published page", async () => {
    const runtime = createPublishedImageRuntime(["released-image"]);

    await expect(runtime.resolveImage?.("released-image")).resolves.toEqual({
      imageId: "released-image",
      src: "/api/files/released-image",
      alt: "",
      width: null,
      height: null,
    });
    await expect(runtime.resolveImage?.("draft-image")).resolves.toBeNull();
  });

  test("stops before resolving when rendering is cancelled", async () => {
    const runtime = createPublishedImageRuntime(["released-image"]);
    const controller = new AbortController();
    controller.abort();

    await expect(
      runtime.resolveImage?.("released-image", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
