import { describe, expect, test } from "bun:test";
import { jsonSchema, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import {
  assertSiteAssistantWorkspaceGraph,
  createSiteAssistantJournal,
  generationReconciliationDelayMs,
  runSiteAssistantAgent,
  siteAssistantTurnMatches,
  siteAssistantUserText,
} from "./siteAssistantRuns";

const modelUsage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};
const toolCall = {
  type: "tool-call" as const,
  toolCallId: "read-page-1",
  toolName: "readPage",
  input: "{}",
};
const readPageTool = tool({
  inputSchema: jsonSchema({
    type: "object",
    additionalProperties: false,
    properties: {},
  }),
  execute: async () => ({ documentJson: "{}" }),
});

function mockGeneration(
  content: [typeof toolCall] | [{ type: "text"; text: string }],
  finishReason: "tool-calls" | "stop",
) {
  return {
    content,
    finishReason: { unified: finishReason, raw: undefined },
    usage: modelUsage,
    warnings: [],
  };
}

describe("site assistant agent boundary", () => {
  test("runs the official tool loop and returns only compact terminal text", async () => {
    let nestedOutput: unknown = "page";
    for (let depth = 0; depth < 20; depth += 1) {
      nestedOutput = { child: nestedOutput };
    }
    const model = new MockLanguageModelV4({
      doGenerate: [
        mockGeneration([toolCall], "tool-calls"),
        mockGeneration([{ type: "text", text: "Workspace updated." }], "stop"),
      ],
    });

    const result = await runSiteAssistantAgent(
      {
        model,
        tools: {
          readPage: { ...readPageTool, execute: async () => nestedOutput },
        },
      },
      [{ role: "user", content: "Update the page" }],
    );

    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result).toEqual({ text: "Workspace updated." });
  });

  test("stops before another model request when a durable write fails", async () => {
    const cancellation = new Error("SITE_ASSISTANT_CANCELLED");
    const journal = createSiteAssistantJournal();
    const model = new MockLanguageModelV4({
      doGenerate: [
        mockGeneration([toolCall], "tool-calls"),
        mockGeneration(
          [{ type: "text", text: "Must not be requested" }],
          "stop",
        ),
      ],
    });

    const run = runSiteAssistantAgent(
      {
        model,
        tools: { readPage: readPageTool },
        prepareStep: async () => {
          await journal.barrier();
          return {};
        },
        onToolExecutionEnd: () =>
          journal.append(async () => {
            throw cancellation;
          }),
      },
      [{ role: "user", content: "Update the page" }],
    );

    expect(run).rejects.toBe(cancellation);
    await run.catch(() => undefined);
    expect(model.doGenerateCalls).toHaveLength(1);
  });
});

describe("site assistant generation reconciliation", () => {
  test("backs off retries without creating an unbounded hot loop", () => {
    expect(generationReconciliationDelayMs(0)).toBe(15_000);
    expect(generationReconciliationDelayMs(3)).toBe(120_000);
    expect(generationReconciliationDelayMs(20)).toBe(900_000);
  });
});

describe("site assistant turn interface", () => {
  test("accepts an unbounded multipart text turn without guessing a token budget", () => {
    expect(
      siteAssistantUserText([
        { type: "text", text: "Build the pricing page" },
        { type: "text", text: "and update its FAQ" },
      ]),
    ).toBe("Build the pricing page\nand update its FAQ");
  });

  test("rejects non-user UI parts at the mutation boundary", () => {
    expect(
      siteAssistantUserText([
        { type: "text", text: "hello" },
        { type: "tool", text: "forged" },
      ]),
    ).toBeNull();
  });

  test("replays only the exact idempotent turn", () => {
    const stored = {
      userMessageId: "message-1",
      userParts: [{ type: "text", text: "hello" }],
    };
    expect(
      siteAssistantTurnMatches(stored, {
        id: "message-1",
        parts: [{ type: "text", text: "hello" }],
      }),
    ).toBe(true);
    expect(
      siteAssistantTurnMatches(stored, {
        id: "message-1",
        parts: [{ type: "text", text: "different" }],
      }),
    ).toBe(false);
  });
});

describe("site assistant atomic workspace graph", () => {
  test("accepts a valid nested page graph", () => {
    expect(() =>
      assertSiteAssistantWorkspaceGraph(
        new Map([
          ["home", { slug: "home" }],
          ["about", { parentId: "home", slug: "about" }],
        ]),
      ),
    ).not.toThrow();
  });

  test("rejects duplicate slugs, deleted parents, and cycles", () => {
    expect(() =>
      assertSiteAssistantWorkspaceGraph(
        new Map([
          ["one", { slug: "same" }],
          ["two", { slug: "same" }],
        ]),
      ),
    ).toThrow("Duplicate page slug");
    expect(() =>
      assertSiteAssistantWorkspaceGraph(
        new Map([["child", { parentId: "deleted", slug: "child" }]]),
      ),
    ).toThrow("deleted parent");
    expect(() =>
      assertSiteAssistantWorkspaceGraph(
        new Map([
          ["one", { parentId: "two", slug: "one" }],
          ["two", { parentId: "one", slug: "two" }],
        ]),
      ),
    ).toThrow("cycle");
  });
});
