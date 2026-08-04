import { describe, expect, test } from "bun:test";
import {
  MAX_AI_WORKSPACE_CONTENT_BYTES,
  assertWorkspaceDocumentContentSize,
} from "./aiWorkspaceBounds";

describe("assertWorkspaceDocumentContentSize", () => {
  test("accepts aggregate active content at the workspace limit", () => {
    expect(() =>
      assertWorkspaceDocumentContentSize([
        { contentSize: 12_000_000 },
        null,
        { contentSize: MAX_AI_WORKSPACE_CONTENT_BYTES - 12_000_000 },
      ]),
    ).not.toThrow();
  });

  test("rejects aggregate active content before blob loading", () => {
    expect(() =>
      assertWorkspaceDocumentContentSize([
        { contentSize: 16_000_001 },
        { contentSize: 16_000_000 },
      ]),
    ).toThrow("AI workspace content exceeds the 32000000 byte limit");
  });

  test("rejects corrupt persisted sizes", () => {
    expect(() =>
      assertWorkspaceDocumentContentSize([{ contentSize: -1 }]),
    ).toThrow("invalid persisted content size");
  });
});
