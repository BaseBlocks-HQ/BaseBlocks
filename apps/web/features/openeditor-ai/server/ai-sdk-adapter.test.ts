import { describe, expect, test } from "bun:test";
import { InMemoryWorkspaceFileStore } from "@openeditor/workspace";
import {
  assertEditorAgentInputBudget,
  createEditorWorkspaceAgent,
} from "./ai-sdk-adapter";

describe("editor workspace agent", () => {
  test("enforces a bounded agent loop", () => {
    expect(() =>
      createEditorWorkspaceAgent({
        model: "openai/gpt-5.4-mini",
        store: new InMemoryWorkspaceFileStore(),
        maxRequests: 0,
        maxInputTokens: 1_000,
        maxOutputTokens: 1_000,
      }),
    ).toThrow("maxRequests must be an integer between 1 and 100");
  });

  test("treats UTF-8 bytes as an estimate rather than one token per byte", () => {
    expect(() =>
      assertEditorAgentInputBudget({
        messages: [{ role: "user", content: "x".repeat(60_000) }],
        steps: [],
        maxInputTokens: 64_000,
      }),
    ).not.toThrow();
  });
});
