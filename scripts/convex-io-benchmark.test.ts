import { describe, expect, test } from "bun:test";
import {
  assessCoverage,
  assertRunSafety,
  buildOperations,
  createBenchmarkDocument,
  parseCompletionLines,
  summarizeByScenario,
  summarizeEvents,
  type BenchmarkConfig,
} from "./convex-io-benchmark";

const config: BenchmarkConfig = {
  label: "candidate-a",
  deployment: "staging",
  fixture: {
    fixtureIsDisposable: true,
    libraryId: "library",
    organizationSlug: "acme",
    pageId: "page",
    releaseId: "release",
    searchQuery: "handbook",
    siteId: "site",
    siteSlug: "docs",
  },
  counts: {
    "published-resolve": 2,
    "save-burst": 1,
  },
};

describe("Convex I/O benchmark", () => {
  test("builds deterministic operations and valid versioned documents", () => {
    const operations = buildOperations(config);
    expect(
      operations.filter(
        (operation) => operation.scenario === "published-resolve",
      ),
    ).toHaveLength(2);
    expect(
      operations.filter((operation) => operation.scenario === "save-burst"),
    ).toHaveLength(1);
    expect(createBenchmarkDocument("candidate a", 3)).toEqual({
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          attrs: { "openeditor-id": "io_benchmark_candidate_a_3" },
        },
      ],
    });
    const sized = createBenchmarkDocument("candidate a", 3, 200_000);
    expect(sized.content[0].content?.[0].text).toHaveLength(200_000);
  });

  test("blocks writes without all non-production safety gates", () => {
    const writes = buildOperations(config).filter(
      (operation) => operation.kind === "mutation",
    );
    expect(() =>
      assertRunSafety(config, writes, { allowWrites: false }),
    ).toThrow("--allow-writes");
    expect(() =>
      assertRunSafety(config, writes, {
        allowWrites: true,
        confirmation: "dev",
      }),
    ).toThrow("--confirm-deployment staging");
    expect(() =>
      assertRunSafety({ ...config, deployment: "prod" }, writes, {
        allowWrites: true,
        confirmation: "prod",
      }),
    ).toThrow("disabled for production");
  });

  test("parses and aggregates Convex completion usage", () => {
    const events = parseCompletionLines(
      [
        "Watching logs...",
        JSON.stringify({
          kind: "Completion",
          identifier: "published:resolveSite",
          executionTime: 0.01,
          returnBytes: 20,
          usageStats: { databaseIoReadBytes: 100, databaseReadDocuments: 2 },
        }),
        "not-json",
        JSON.stringify({ kind: "LogLine", identifier: "ignored" }),
      ].join("\n"),
    );
    expect(events).toHaveLength(1);
    expect(summarizeEvents(events)).toMatchObject({
      count: 1,
      databaseIoReadBytes: 100,
      databaseReadDocuments: 2,
      returnBytes: 20,
    });
    const operations = buildOperations({
      ...config,
      counts: Object.fromEntries(
        Object.keys(config.counts ?? {}).map((key) => [key, 0]),
      ),
    });
    const scenarios = summarizeByScenario(events, [
      {
        args: {},
        functionName: "published:resolveSite",
        index: 0,
        kind: "query",
        scenario: "published-resolve",
      },
      ...operations,
    ]);
    expect(scenarios["published-resolve"]?.databaseIoReadBytes).toBe(100);
    expect(
      assessCoverage(scenarios, [
        {
          args: {},
          functionName: "published:resolveSite",
          index: 0,
          kind: "query",
          scenario: "published-resolve",
        },
        {
          args: {},
          functionName: "published:resolveSite",
          index: 1,
          kind: "query",
          scenario: "published-resolve",
        },
      ]).anomalies,
    ).toEqual(["published-resolve: expected 2 completion events, observed 1"]);
  });
});
