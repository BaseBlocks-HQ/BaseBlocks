import { describe, expect, test } from "bun:test";
import { getAgentActivity } from "./agent-activity-model";

describe("getAgentActivity", () => {
  test("normalizes AI SDK tool parts", () => {
    expect(
      getAgentActivity({
        parts: [
          {
            type: "tool-inspectSite",
            toolCallId: "call-1",
            state: "output-available",
          },
          {
            type: "dynamic-tool",
            toolCallId: "call-2",
            toolName: "update_page",
            state: "input-available",
          },
          { type: "text", text: "Done" },
        ],
      }),
    ).toEqual([
      {
        id: "call-1",
        label: "Inspect Site",
        state: "completed",
      },
      {
        id: "call-2",
        label: "Update page",
        state: "pending",
      },
    ]);
  });

  test("uses a completed message status for compact tool-call summaries", () => {
    expect(
      getAgentActivity({
        status: "completed",
        toolCalls: [{ id: "call-1", toolName: "validateSite" }],
      }),
    ).toEqual([
      {
        id: "call-1",
        label: "Validate Site",
        state: "completed",
      },
    ]);
  });

  test("ignores text parts and malformed activity", () => {
    expect(
      getAgentActivity({ parts: [{ type: "text", text: "Hello" }, null] }),
    ).toEqual([]);
  });

  test("hides model step boundaries and completion plumbing", () => {
    expect(
      getAgentActivity({
        parts: [
          { type: "step-start", step: 1 },
          {
            type: "tool",
            toolCallId: "finish-1",
            toolName: "finishTask",
            state: "output-available",
          },
          { type: "step-finish", step: 1, finishReason: "tool-calls" },
        ],
      }),
    ).toEqual([]);
  });

  test("projects tool output into useful expandable details", () => {
    expect(
      getAgentActivity({
        parts: [
          {
            type: "tool",
            toolCallId: "manifest-1",
            toolName: "getSiteManifest",
            state: "output-available",
            output: {
              site: { name: "Docs", draftRevision: 12 },
              pages: [{ title: "Home" }, { title: "API" }],
            },
          },
        ],
      }),
    ).toEqual([
      {
        id: "manifest-1",
        label: "Inspected site structure",
        detail: "2 pages in Docs",
        details: [
          { label: "Site", value: "Docs" },
          { label: "Pages", value: "Home, API" },
          { label: "Draft revision", value: "12" },
        ],
        state: "completed",
      },
    ]);
  });
});
