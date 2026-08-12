import { describe, expect, test } from "bun:test";
import {
  assertSiteAssistantWorkspaceGraph,
  generationReconciliationDelayMs,
  siteAssistantTurnMatches,
  siteAssistantUserText,
} from "./siteAssistantRuns";

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
