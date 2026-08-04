import { describe, expect, test } from "bun:test";
import { InMemoryWorkspaceFileStore } from "@openeditor/workspace";
import { createEditorWorkspaceAgent } from "./ai-sdk-adapter";

describe("editor workspace agent", () => {
  test("enforces a bounded agent loop", () => {
    expect(() =>
      createEditorWorkspaceAgent({
        model: "openai/gpt-5.4-mini",
        store: new InMemoryWorkspaceFileStore(),
        maxRequests: 0,
        maxOutputTokens: 1_000,
      }),
    ).toThrow("maxRequests must be an integer between 1 and 100");
  });
});
