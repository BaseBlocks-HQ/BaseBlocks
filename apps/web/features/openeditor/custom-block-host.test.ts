import { describe, expect, test } from "bun:test";
import { createBaseBlocksCustomBlockHost } from "./custom-block-host";

describe("custom block URL resolution", () => {
  test("keeps authorized managed-asset URLs usable", async () => {
    const host = createBaseBlocksCustomBlockHost(new Set(["asset-1"]));

    const asset = await host.assets.resolve("asset-1");

    expect(asset).toEqual({ src: "/api/files/asset-1", alt: "" });
    expect(host.resolveUrl(asset!.src, "asset")).toBe("/api/files/asset-1");
  });

  test("rejects protocol-relative managed-asset URLs", () => {
    const host = createBaseBlocksCustomBlockHost(new Set());

    expect(host.resolveUrl("//other.example/file", "asset")).toBeNull();
  });
});

test("custom block host forwards pending asset disposal", async () => {
  const discarded: string[] = [];
  const host = createBaseBlocksCustomBlockHost(
    new Set(),
    undefined,
    async (id) => {
      discarded.push(id);
    },
  );

  await host.assets.discard?.("pending-asset");
  expect(discarded).toEqual(["pending-asset"]);
});
