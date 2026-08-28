import { describe, expect, test } from "bun:test";
import {
  extractionBlocksPublication,
  extractionRetryInvalidatesDraft,
  publicationActionForTarget,
} from "./releaseState";

describe("release promotion", () => {
  test("moving from version 2 to version 1 is a rollback", () => {
    expect(publicationActionForTarget(2, 1)).toBe("rollback");
  });

  test("version 2 can be promoted again after rolling back to version 1", () => {
    expect(publicationActionForTarget(1, 2)).toBe("republish");
  });

  test("publishing when nothing is live is a republish operation", () => {
    expect(publicationActionForTarget(undefined, 1)).toBe("republish");
  });
});

describe("release publication guards", () => {
  test("blocks only while document extraction is incomplete", () => {
    expect(extractionBlocksPublication("queued")).toBe(true);
    expect(extractionBlocksPublication("processing")).toBe(true);
    expect(extractionBlocksPublication("ready")).toBe(false);
    expect(extractionBlocksPublication("failed")).toBe(false);
  });

  test("invalidates an in-flight publication when extraction is retried", () => {
    expect(extractionRetryInvalidatesDraft("ready")).toBe(true);
    expect(extractionRetryInvalidatesDraft("failed")).toBe(true);
    expect(extractionRetryInvalidatesDraft(undefined)).toBe(true);
    expect(extractionRetryInvalidatesDraft("processing")).toBe(false);
  });
});
