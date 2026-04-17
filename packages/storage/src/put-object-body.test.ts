import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { toPutObjectBody } from "./put-object-body";

describe("put object body", () => {
  test("returns bytes unchanged when already buffered", async () => {
    const body = new Uint8Array([1, 2, 3]);

    const result = await toPutObjectBody(body);

    expect(result).toBe(body);
  });

  test("buffers a readable stream before upload", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3, 4]));
        controller.close();
      },
    });

    const result = await toPutObjectBody(body);

    expect(Array.from(result)).toEqual([1, 2, 3, 4]);
  });

  test("buffers a node readable before upload", async () => {
    const body = Readable.from([Buffer.from([1, 2]), Buffer.from([3, 4])]);

    const result = await toPutObjectBody(body);

    expect(Array.from(result)).toEqual([1, 2, 3, 4]);
  });
});
