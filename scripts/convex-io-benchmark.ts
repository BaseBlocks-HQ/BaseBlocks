import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type Deployment = "dev" | "local" | "prod" | "staging" | string;
type OperationKind = "mutation" | "query";

export type BenchmarkConfig = {
  label: string;
  deployment: Deployment;
  identity?: Record<string, unknown>;
  fixture: {
    siteId: string;
    pageId: string;
    releaseId: string;
    libraryId: string;
    organizationSlug: string;
    siteSlug: string;
    publishedPath?: string;
    searchQuery: string;
    fixtureIsDisposable?: boolean;
  };
  counts?: Partial<Record<ScenarioName, number>>;
  functions?: Partial<Record<ScenarioName, string>>;
  savePayloadBytes?: number;
  settleMs?: number;
};

export type ScenarioName =
  | "draft-status"
  | "library-explorer"
  | "page-content"
  | "pages-list"
  | "published-favicon"
  | "published-page"
  | "published-resolve"
  | "release-get"
  | "release-list"
  | "save-burst"
  | "search";

export type BenchmarkOperation = {
  args: Record<string, unknown>;
  functionName: string;
  index: number;
  kind: OperationKind;
  scenario: ScenarioName;
};

type UsageStats = {
  databaseIoReadBytes?: number;
  databaseIoWriteBytes?: number;
  databaseReadBytes?: number;
  databaseReadDocuments?: number;
  databaseWriteBytes?: number;
  networkEgressBytes?: number;
  storageReadBytes?: number;
  storageWriteBytes?: number;
  textIndexQueryBytes?: number;
  textIndexWriteQueryBytes?: number;
  vectorIndexReadBytes?: number;
  vectorIndexWriteBytes?: number;
};

export type CompletionEvent = {
  cachedResult?: boolean;
  executionTime?: number;
  identifier?: string;
  kind?: string;
  occInfo?: unknown;
  returnBytes?: number;
  timestamp?: number;
  usageStats?: UsageStats;
  willRetry?: boolean;
};

type Summary = {
  cachedResults: number;
  count: number;
  databaseIoReadBytes: number;
  databaseIoWriteBytes: number;
  databaseReadDocuments: number;
  executionTimeMs: { mean: number; p50: number; p95: number };
  networkEgressBytes: number;
  retries: number;
  returnBytes: number;
  storageReadBytes: number;
  storageWriteBytes: number;
  textIndexQueryBytes: number;
  textIndexWriteQueryBytes: number;
};

const DEFAULT_COUNTS: Record<ScenarioName, number> = {
  "draft-status": 20,
  "library-explorer": 20,
  "page-content": 20,
  "pages-list": 20,
  "published-favicon": 100,
  "published-page": 100,
  "published-resolve": 100,
  "release-get": 10,
  "release-list": 20,
  "save-burst": 10,
  search: 20,
};

const DEFAULT_FUNCTIONS: Record<ScenarioName, string> = {
  "draft-status": "releases:getDraftSummary",
  "library-explorer": "libraries:getPublishedExplorer",
  "page-content": "pageContent:get",
  "pages-list": "pages:list",
  "published-favicon": "published:getFavicon",
  "published-page": "published:getPage",
  "published-resolve": "published:resolveSite",
  "release-get": "releases:get",
  "release-list": "releases:list",
  "save-burst": "pageContent:save",
  search: "search:searchPublished",
};

const MUTATION_SCENARIOS = new Set<ScenarioName>(["save-burst"]);

function positiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback;
}

export function createBenchmarkDocument(
  runLabel: string,
  index: number,
  payloadBytes = 0,
) {
  if (
    !Number.isInteger(payloadBytes) ||
    payloadBytes < 0 ||
    payloadBytes > 800_000
  ) {
    throw new Error("savePayloadBytes must be an integer between 0 and 800000");
  }
  const content =
    payloadBytes > 0
      ? [{ type: "text", text: `${index}:`.padEnd(payloadBytes, "x") }]
      : undefined;
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        attrs: {
          "openeditor-id": `io_benchmark_${sanitize(runLabel)}_${index}`,
        },
        ...(content ? { content } : {}),
      },
    ],
  };
}

function sanitize(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

export function buildOperations(config: BenchmarkConfig): BenchmarkOperation[] {
  const fixture = config.fixture;
  const functions = { ...DEFAULT_FUNCTIONS, ...config.functions };
  const args: Record<ScenarioName, (index: number) => Record<string, unknown>> =
    {
      "draft-status": () => ({ siteId: fixture.siteId }),
      "library-explorer": () => ({ libraryId: fixture.libraryId }),
      "page-content": () => ({ pageId: fixture.pageId }),
      "pages-list": () => ({ siteId: fixture.siteId }),
      "published-favicon": () => ({
        organizationSlug: fixture.organizationSlug,
        siteSlug: fixture.siteSlug,
      }),
      "published-page": () => ({
        path: fixture.publishedPath ?? "/",
        releaseId: fixture.releaseId,
      }),
      "published-resolve": () => ({
        organizationSlug: fixture.organizationSlug,
        siteSlug: fixture.siteSlug,
      }),
      "release-get": () => ({ releaseId: fixture.releaseId }),
      "release-list": () => ({ siteId: fixture.siteId }),
      "save-burst": (index) => ({
        content: createBenchmarkDocument(
          config.label,
          index,
          config.savePayloadBytes,
        ),
        pageId: fixture.pageId,
      }),
      search: () => ({
        limit: 20,
        query: fixture.searchQuery,
        siteId: fixture.siteId,
      }),
    };

  return (Object.keys(DEFAULT_COUNTS) as ScenarioName[]).flatMap((scenario) => {
    const count = positiveInteger(
      config.counts?.[scenario],
      DEFAULT_COUNTS[scenario],
    );
    return Array.from({ length: count }, (_, index) => ({
      args: args[scenario](index),
      functionName: functions[scenario],
      index,
      kind: MUTATION_SCENARIOS.has(scenario) ? "mutation" : "query",
      scenario,
    }));
  });
}

export function assertRunSafety(
  config: BenchmarkConfig,
  operations: BenchmarkOperation[],
  options: { allowWrites: boolean; confirmation?: string },
) {
  const writes = operations.filter(
    (operation) => operation.kind === "mutation",
  );
  if (writes.length === 0) return;
  if (isProduction(config.deployment)) {
    throw new Error(
      "Mutation benchmarks are disabled for production. Set save-burst to 0 and use a disposable non-production fixture.",
    );
  }
  if (!options.allowWrites) {
    throw new Error("Mutation benchmarks require --allow-writes.");
  }
  if (!config.fixture.fixtureIsDisposable) {
    throw new Error(
      "Mutation benchmarks require fixture.fixtureIsDisposable=true.",
    );
  }
  if (options.confirmation !== config.deployment) {
    throw new Error(
      `Mutation benchmarks require --confirm-deployment ${config.deployment}.`,
    );
  }
}

function isProduction(deployment: string) {
  return deployment === "prod" || deployment.startsWith("prod/");
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
    ] ?? 0
  );
}

export function summarizeEvents(events: CompletionEvent[]): Summary {
  const times = events.map((event) => number(event.executionTime) * 1000);
  const sumUsage = (key: keyof UsageStats) =>
    events.reduce((sum, event) => sum + number(event.usageStats?.[key]), 0);
  return {
    cachedResults: events.filter((event) => event.cachedResult).length,
    count: events.length,
    databaseIoReadBytes: sumUsage("databaseIoReadBytes"),
    databaseIoWriteBytes: sumUsage("databaseIoWriteBytes"),
    databaseReadDocuments: sumUsage("databaseReadDocuments"),
    executionTimeMs: {
      mean: times.length
        ? times.reduce((sum, value) => sum + value, 0) / times.length
        : 0,
      p50: percentile(times, 0.5),
      p95: percentile(times, 0.95),
    },
    networkEgressBytes: sumUsage("networkEgressBytes"),
    retries: events.filter((event) => event.willRetry || event.occInfo).length,
    returnBytes: events.reduce(
      (sum, event) => sum + number(event.returnBytes),
      0,
    ),
    storageReadBytes: sumUsage("storageReadBytes"),
    storageWriteBytes: sumUsage("storageWriteBytes"),
    textIndexQueryBytes: sumUsage("textIndexQueryBytes"),
    textIndexWriteQueryBytes: sumUsage("textIndexWriteQueryBytes"),
  };
}

export function summarizeByScenario(
  events: CompletionEvent[],
  operations: BenchmarkOperation[],
) {
  const scenariosByFunction = new Map(
    operations.map((operation) => [operation.functionName, operation.scenario]),
  );
  const grouped = new Map<string, CompletionEvent[]>();
  for (const event of events) {
    if (event.kind !== "Completion" || !event.identifier) continue;
    const scenario =
      scenariosByFunction.get(event.identifier) ??
      `background:${event.identifier}`;
    const values = grouped.get(scenario) ?? [];
    values.push(event);
    grouped.set(scenario, values);
  }
  return Object.fromEntries(
    [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([scenario, values]) => [scenario, summarizeEvents(values)]),
  );
}

export function assessCoverage(
  scenarios: Record<string, Summary>,
  operations: BenchmarkOperation[],
) {
  const expected = operations.reduce<Record<string, number>>(
    (counts, operation) => {
      counts[operation.scenario] = (counts[operation.scenario] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const observed = Object.fromEntries(
    Object.entries(scenarios)
      .filter(([scenario]) => !scenario.startsWith("background:"))
      .map(([scenario, summary]) => [scenario, summary.count]),
  );
  const anomalies = Object.entries(expected).flatMap(
    ([scenario, expectedCount]) => {
      const observedCount = observed[scenario] ?? 0;
      return observedCount === expectedCount
        ? []
        : [
            `${scenario}: expected ${expectedCount} completion events, observed ${observedCount}`,
          ];
    },
  );
  return { anomalies, expected, observed };
}

export function parseCompletionLines(text: string): CompletionEvent[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const candidate = line.trim();
    if (!candidate.startsWith("{")) return [];
    try {
      const value = JSON.parse(candidate) as CompletionEvent;
      return value.kind === "Completion" ? [value] : [];
    } catch {
      return [];
    }
  });
}

async function loadConfig(path: string) {
  const config = JSON.parse(
    await readFile(resolve(path), "utf8"),
  ) as BenchmarkConfig;
  if (!config.label || !config.deployment || !config.fixture) {
    throw new Error("Config requires label, deployment, and fixture.");
  }
  return config;
}

function readFlag(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function collectStream(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return "";
  return new Response(stream).text();
}

async function runRemote(
  config: BenchmarkConfig,
  operations: BenchmarkOperation[],
) {
  const backendDirectory = resolve(process.cwd(), "packages/backend");
  const convexCli = resolve(backendDirectory, "node_modules/.bin/convex");
  const logger = Bun.spawn(
    [
      convexCli,
      "logs",
      "--deployment",
      config.deployment,
      "--history",
      "0",
      "--success",
      "--jsonl",
    ],
    { cwd: backendDirectory, stderr: "pipe", stdout: "pipe" },
  );
  const logOutput = collectStream(logger.stdout);
  const logErrors = collectStream(logger.stderr);
  await Bun.sleep(750);

  const operationResults: Array<BenchmarkOperation & { durationMs: number }> =
    [];
  try {
    for (const operation of operations) {
      const command = [
        convexCli,
        "run",
        operation.functionName,
        JSON.stringify(operation.args),
        "--deployment",
        config.deployment,
        "--typecheck",
        "disable",
        "--codegen",
        "disable",
      ];
      if (config.identity)
        command.push("--identity", JSON.stringify(config.identity));
      const startedAt = performance.now();
      const child = Bun.spawn(command, {
        cwd: backendDirectory,
        stderr: "pipe",
        stdout: "pipe",
      });
      const [exitCode, stderr] = await Promise.all([
        child.exited,
        collectStream(child.stderr),
        collectStream(child.stdout),
      ]).then(([code, errors]) => [code, errors] as const);
      if (exitCode !== 0) {
        throw new Error(
          `${operation.scenario} (${operation.functionName}) failed: ${stderr.trim()}`,
        );
      }
      operationResults.push({
        ...operation,
        durationMs: performance.now() - startedAt,
      });
    }
    await Bun.sleep(
      config.settleMs ??
        (operations.some((op) => op.kind === "mutation") ? 12_000 : 1_500),
    );
  } finally {
    logger.kill();
    await Promise.race([
      logger.exited,
      Bun.sleep(1_000).then(() => {
        Bun.spawnSync(["kill", "-9", String(logger.pid)]);
      }),
    ]);
    await logger.exited;
  }

  const [stdout, stderr] = await Promise.all([logOutput, logErrors]);
  const events = parseCompletionLines(stdout);
  if (events.length === 0) {
    throw new Error(
      `No Convex completion events captured. Log stream output: ${stderr.trim()}`,
    );
  }
  return { events, operationResults };
}

async function writeJson(path: string, value: unknown) {
  const target = resolve(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  return target;
}

type ComparableReport = {
  label?: string;
  scenarios?: Record<string, Record<string, unknown>>;
};

function compareReports(before: ComparableReport, after: ComparableReport) {
  const scenarios = new Set([
    ...Object.keys(before.scenarios ?? {}),
    ...Object.keys(after.scenarios ?? {}),
  ]);
  const metrics = [
    "databaseIoReadBytes",
    "databaseIoWriteBytes",
    "databaseReadDocuments",
    "networkEgressBytes",
    "returnBytes",
    "textIndexQueryBytes",
    "textIndexWriteQueryBytes",
  ];
  return Object.fromEntries(
    [...scenarios].sort().map((scenario) => {
      const left = before.scenarios?.[scenario] ?? {};
      const right = after.scenarios?.[scenario] ?? {};
      return [
        scenario,
        Object.fromEntries(
          metrics.map((metric) => {
            const beforeValue = number(left[metric]);
            const afterValue = number(right[metric]);
            return [
              metric,
              {
                after: afterValue,
                before: beforeValue,
                change: afterValue - beforeValue,
                ratio: beforeValue === 0 ? null : afterValue / beforeValue,
              },
            ];
          }),
        ),
      ];
    }),
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const output =
    readFlag(args, "--out") ?? `.artifacts/convex-io/${command}.json`;
  if (command === "compare") {
    const beforePath = readFlag(args, "--before");
    const afterPath = readFlag(args, "--after");
    if (!beforePath || !afterPath)
      throw new Error("compare requires --before and --after.");
    const [before, after] = await Promise.all(
      [beforePath, afterPath].map(async (path) =>
        JSON.parse(await readFile(resolve(path), "utf8")),
      ),
    );
    const target = await writeJson(output, {
      after: after.label,
      before: before.label,
      generatedAt: new Date().toISOString(),
      scenarios: compareReports(before, after),
    });
    process.stdout.write(`${target}\n`);
    return;
  }

  if (command === "model") {
    const target = await writeJson(output, {
      generatedAt: new Date().toISOString(),
      label: "recorded-pre-refactor-model",
      notes:
        "Recorded production baseline and pre-refactor model; use measured reports for promotion decisions.",
      recordedBaseline: {
        monthlyRecurringBytes: 1.074e9,
        monthlyTotalBytes: 1.566e9,
        oneTimeMigrationAndBackupBytes: 434.05e6,
      },
      scenarios: {
        "published-resolve-100": { afterBytes: 0.04e6, beforeBytes: 3.77e6 },
        "save-burst-10": { afterBytes: 2.16e6, beforeBytes: 7.78e6 },
      },
    });
    process.stdout.write(`${target}\n`);
    return;
  }

  const configPath = readFlag(args, "--config");
  if (!configPath)
    throw new Error(`${command ?? "command"} requires --config.`);
  const config = await loadConfig(configPath);
  const operations = buildOperations(config);
  if (command === "plan") {
    const target = await writeJson(output, {
      deployment: config.deployment,
      label: config.label,
      operations,
      writes: operations.filter((operation) => operation.kind === "mutation")
        .length,
    });
    process.stdout.write(`${target}\n`);
    return;
  }
  if (command !== "run") throw new Error("Use plan, run, model, or compare.");
  assertRunSafety(config, operations, {
    allowWrites: args.includes("--allow-writes"),
    confirmation: readFlag(args, "--confirm-deployment"),
  });
  const startedAt = new Date().toISOString();
  const { events, operationResults } = await runRemote(config, operations);
  const scenarios = summarizeByScenario(events, operations);
  const coverage = assessCoverage(scenarios, operations);
  if (
    Object.values(coverage.observed).reduce((sum, value) => sum + value, 0) ===
    0
  ) {
    throw new Error(
      "The log stream captured no completion events for benchmark functions.",
    );
  }
  const target = await writeJson(output, {
    coverage,
    deployment: config.deployment,
    finishedAt: new Date().toISOString(),
    label: config.label,
    operationCount: operations.length,
    operationWallTimeMs: operationResults.reduce(
      (sum, value) => sum + value.durationMs,
      0,
    ),
    scenarios,
    startedAt,
  });
  process.stdout.write(`${target}\n`);
}

if (import.meta.main) {
  await main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
