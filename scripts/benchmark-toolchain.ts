import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { arch, cpus, freemem, release, tmpdir, totalmem } from "node:os";
import { performance } from "node:perf_hooks";

type BenchmarkCategory = "bun" | "build" | "quality" | "test" | "typescript";

type CommandSpec = {
  name: string;
  category: BenchmarkCategory;
  args: string[];
  clean?: string[];
  repeats?: number;
  cwd?: string;
  env?: Record<string, string>;
};

type ResourceMetrics = {
  userMs?: number;
  systemMs?: number;
  maxRssBytes?: number;
  pageReclaims?: number;
  pageFaults?: number;
  swaps?: number;
  voluntaryContextSwitches?: number;
  involuntaryContextSwitches?: number;
  instructionsRetired?: number;
  cyclesElapsed?: number;
  peakMemoryFootprintBytes?: number;
};

type BenchmarkSample = ResourceMetrics & {
  command: string[];
  cwd: string;
  exitCode: number;
  iteration: number;
  stderrBytes: number;
  stderrTail?: string;
  stdoutBytes: number;
  stdoutTail?: string;
  wallMs: number;
};

type BenchmarkResult = {
  category: BenchmarkCategory;
  name: string;
  repeats: number;
  samples: BenchmarkSample[];
  summary: {
    maxWallMs: number;
    meanWallMs: number;
    medianWallMs: number;
    minWallMs: number;
    passed: boolean;
  };
};

type BenchmarkReport = {
  generatedAt: string;
  git: {
    commit: string;
    dirty: boolean;
  };
  host: {
    arch: string;
    cpu: string;
    cpus: number;
    freeMemoryBytes: number;
    node: string;
    os: string;
    platform: string;
    totalMemoryBytes: number;
  };
  label: string;
  lockfile: {
    bytes: number;
    sha256: string;
  };
  results: BenchmarkResult[];
  toolchain: {
    bun: string;
    packageManager: string;
    typescript: string;
  };
};

const root = resolve(import.meta.dir, "..");
const bunPath = process.execPath;
const defaultOutput = join(root, "benchmarks", "results", `${process.env.BENCHMARK_LABEL ?? "local"}.json`);
const outputPath = process.env.BENCHMARK_OUTPUT ?? defaultOutput;
const label = process.env.BENCHMARK_LABEL ?? "local";
const skippedBenchmarks = new Set((process.env.BENCHMARK_SKIP ?? "").split(",").filter(Boolean));
const tailLength = 4_000;

const buildEnvironment: Record<string, string> = {
  CI: "1",
  FILES_ACCESS_KEY_ID: "benchmark",
  FILES_ADAPTER: "s3",
  FILES_BUCKET: "benchmark-bucket",
  FILES_ENDPOINT: "https://example.invalid",
  FILES_FORCE_PATH_STYLE: "true",
  FILES_MAX_UPLOAD_SIZE_BYTES: "104857600",
  FILES_REGION: "us-east-1",
  FILES_SECRET_ACCESS_KEY: "benchmark",
  GITHUB_TOKEN: "benchmark",
  NEXT_PUBLIC_CONVEX_SITE_URL: "https://placeholder.convex.site",
  NEXT_PUBLIC_CONVEX_URL: "https://placeholder.convex.cloud",
  NEXT_PUBLIC_ROOT_DOMAIN: "baseblocks.dev",
  NEXT_PUBLIC_SITE_URL: "https://baseblocks.dev",
  NEXT_TELEMETRY_DISABLED: "1",
  TURBO_FORCE: "1",
  ...(process.env.GITHUB_TOKEN ? { GITHUB_TOKEN: process.env.GITHUB_TOKEN } : {}),
};

function commandForDisplay(args: string[]): string[] {
  return args.map((arg, index) => (index === 0 && arg === bunPath ? "bun" : arg));
}

function bytes(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

function tail(text: string): string | undefined {
  if (!text) return undefined;
  return text.length > tailLength ? text.slice(-tailLength) : text;
}

function metric(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  return match ? Number(match[1]) : undefined;
}

function parseResourceMetrics(stderr: string): ResourceMetrics {
  const isMac = process.platform === "darwin";
  const userSeconds = isMac
    ? metric(stderr, /([\d.]+)\s+user(?:\s|$)/m)
    : metric(stderr, /User time \(seconds\):\s+([\d.]+)/m);
  const systemSeconds = isMac
    ? metric(stderr, /([\d.]+)\s+sys(?:\s|$)/m)
    : metric(stderr, /System time \(seconds\):\s+([\d.]+)/m);
  const rss = isMac
    ? metric(stderr, /([\d]+)\s+maximum resident set size/m)
    : metric(stderr, /Maximum resident set size \(kbytes\):\s+([\d.]+)/m);

  return {
    cyclesElapsed: metric(stderr, /([\d]+)\s+cycles elapsed/m),
    instructionsRetired: metric(stderr, /([\d]+)\s+instructions retired/m),
    involuntaryContextSwitches: isMac
      ? metric(stderr, /([\d]+)\s+involuntary context switches/m)
      : metric(stderr, / involuntary context switches:\s+([\d]+)/m),
    maxRssBytes: rss === undefined ? undefined : isMac ? rss : rss * 1024,
    pageFaults: isMac ? metric(stderr, /([\d]+)\s+page faults/m) : metric(stderr, /Page faults:\s+([\d]+)/m),
    pageReclaims: isMac
      ? metric(stderr, /([\d]+)\s+page reclaims/m)
      : metric(stderr, /Page reclaims:\s+([\d]+)/m),
    peakMemoryFootprintBytes: metric(stderr, /([\d]+)\s+peak memory footprint/m),
    swaps: isMac ? metric(stderr, /([\d]+)\s+swaps/m) : metric(stderr, /Swaps:\s+([\d]+)/m),
    systemMs: systemSeconds === undefined ? undefined : systemSeconds * 1_000,
    userMs: userSeconds === undefined ? undefined : userSeconds * 1_000,
    voluntaryContextSwitches: isMac
      ? metric(stderr, /([\d]+)\s+voluntary context switches/m)
      : metric(stderr, / voluntary context switches:\s+([\d]+)/m),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function timeCommand(args: string[]): string[] {
  if (process.platform === "darwin") return ["/usr/bin/time", "-l", ...args];
  if (process.platform === "linux") return ["/usr/bin/time", "-v", ...args];
  return args;
}

async function runCommand(args: string[], cwd: string, env: Record<string, string>, iteration: number) {
  const startedAt = performance.now();
  const processHandle = Bun.spawn(timeCommand(args), {
    cwd,
    env,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [exitCode, stderr, stdout] = await Promise.all([
    processHandle.exited,
    new Response(processHandle.stderr).text(),
    new Response(processHandle.stdout).text(),
  ]);
  const sample: BenchmarkSample = {
    ...parseResourceMetrics(stderr),
    command: commandForDisplay(args),
    cwd,
    exitCode,
    iteration,
    stderrBytes: bytes(stderr),
    stdoutBytes: bytes(stdout),
    wallMs: performance.now() - startedAt,
  };
  if (exitCode !== 0) {
    sample.stderrTail = tail(stderr);
    sample.stdoutTail = tail(stdout);
  }
  return sample;
}

async function readGitValue(args: string[]): Promise<string> {
  const processHandle = Bun.spawn(["git", ...args], { cwd: root, stdout: "pipe", stderr: "ignore" });
  return (await new Response(processHandle.stdout).text()).trim();
}

async function createCleanInstallWorkspace(): Promise<string> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "baseblocks-toolchain-"));
  const packageFiles = [
    "package.json",
    "bun.lock",
    "apps/web/package.json",
    "packages/backend/package.json",
    "packages/custom-blocks/package.json",
    "packages/domain/package.json",
    "packages/i18n/package.json",
    "packages/openeditor-contracts/package.json",
    "packages/ui/package.json",
    "tooling/tsconfig/package.json",
  ];
  for (const relativePath of packageFiles) {
    const destination = join(temporaryRoot, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, await readFile(join(root, relativePath)));
  }
  return temporaryRoot;
}

async function getPackageManagerVersion(): Promise<string> {
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
    packageManager?: string;
  };
  return packageJson.packageManager ?? "unspecified";
}

async function getTypeScriptVersion(): Promise<string> {
  const processHandle = Bun.spawn([bunPath, "x", "tsc", "--version"], {
    cwd: root,
    stderr: "pipe",
    stdout: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    processHandle.exited,
    new Response(processHandle.stdout).text(),
    new Response(processHandle.stderr).text(),
  ]);
  if (exitCode !== 0) throw new Error(`Unable to read TypeScript version: ${stderr || stdout}`);
  return stdout.trim().replace(/^Version\s+/, "");
}

function commandSpecs(cleanInstallRoot: string): CommandSpec[] {
  return [
    {
      args: [bunPath, "install", "--frozen-lockfile", "--ignore-scripts", "--no-progress"],
      category: "bun",
      cwd: cleanInstallRoot,
      name: "bun:clean-install",
    },
    {
      args: [bunPath, "install", "--frozen-lockfile", "--no-progress"],
      category: "bun",
      name: "bun:warm-install",
    },
    {
      args: [bunPath, "-e", "let total = 0; for (let index = 0; index < 1_000_000; index++) total += index; console.log(total);"],
      category: "bun",
      name: "bun:runtime-startup-and-loop",
      repeats: 3,
    },
    {
      args: [bunPath, "x", "tsc", "--version"],
      category: "typescript",
      name: "typescript:version",
    },
    {
      args: [bunPath, "run", "check-types"],
      category: "typescript",
      clean: ["apps/web/.next"],
      env: { TURBO_FORCE: "1" },
      name: "typescript:repository-check",
    },
    {
      args: [bunPath, "x", "biome", "check", "."],
      category: "quality",
      name: "quality:biome-check",
    },
    {
      args: [bunPath, "run", "test"],
      category: "test",
      name: "test:repository",
    },
    {
      args: [bunPath, "run", "build"],
      category: "build",
      clean: ["apps/web/.next"],
      env: buildEnvironment,
      name: "build:repository",
    },
    {
      args: [bunPath, "run", "seo:audit"],
      category: "build",
      clean: ["apps/web/.next"],
      env: buildEnvironment,
      name: "build:seo-audit",
    },
  ];
}

async function main() {
  const cleanInstallRoot = await createCleanInstallWorkspace();
  const baseEnvironment = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
  const results: BenchmarkResult[] = [];

  try {
    for (const spec of commandSpecs(cleanInstallRoot)) {
      if (skippedBenchmarks.has(spec.name)) {
        console.log(`${spec.name}: skipped`);
        continue;
      }
      for (const relativePath of spec.clean ?? []) {
        await rm(join(root, relativePath), { force: true, recursive: true });
      }
      const repeats = spec.repeats ?? 1;
      const samples: BenchmarkSample[] = [];
      let passed = true;
      for (let iteration = 1; iteration <= repeats; iteration++) {
        const sample = await runCommand(
          spec.args,
          spec.cwd ?? root,
          { ...baseEnvironment, ...spec.env },
          iteration,
        );
        samples.push(sample);
        const status = sample.exitCode === 0 ? "pass" : "fail";
        console.log(`${spec.name} ${iteration}/${repeats}: ${status} ${Math.round(sample.wallMs)}ms`);
        if (sample.exitCode !== 0) {
          passed = false;
          console.error(`${spec.name} failed with exit code ${sample.exitCode}; continuing benchmark suite`);
          break;
        }
      }
      const wallTimes = samples.map((sample) => sample.wallMs);
      results.push({
        category: spec.category,
        name: spec.name,
        repeats,
        samples,
        summary: {
          maxWallMs: Math.max(...wallTimes),
          meanWallMs: wallTimes.reduce((sum, value) => sum + value, 0) / wallTimes.length,
          medianWallMs: median(wallTimes),
          minWallMs: Math.min(...wallTimes),
          passed,
        },
      });
    }
  } finally {
    await rm(cleanInstallRoot, { force: true, recursive: true });
  }

  const lockfile = await readFile(join(root, "bun.lock"));
  const report: BenchmarkReport = {
    generatedAt: new Date().toISOString(),
    git: {
      commit: await readGitValue(["rev-parse", "HEAD"]),
      dirty: Boolean(await readGitValue(["status", "--porcelain"])),
    },
    host: {
      arch: arch(),
      cpu: cpus()[0]?.model ?? "unknown",
      cpus: cpus().length,
      freeMemoryBytes: freemem(),
      node: process.versions.node,
      os: release(),
      platform: process.platform,
      totalMemoryBytes: totalmem(),
    },
    label,
    lockfile: {
      bytes: lockfile.byteLength,
      sha256: createHash("sha256").update(lockfile).digest("hex"),
    },
    results,
    toolchain: {
      bun: Bun.version,
      packageManager: await getPackageManagerVersion(),
      typescript: await getTypeScriptVersion(),
    },
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, JSON.stringify(report, null, 2));
  console.log(`Wrote ${outputPath}`);
  if (results.some((result) => !result.summary.passed)) process.exitCode = 1;
}

if (import.meta.main) {
  await main();
}
