# Toolchain benchmarks

Run the full repository benchmark with:

```sh
bun run benchmark:toolchain
```

Set `BENCHMARK_LABEL` and `BENCHMARK_OUTPUT` to save a named result:

```sh
BENCHMARK_LABEL=baseline \
BENCHMARK_OUTPUT=benchmarks/results/baseline.json \
bun run benchmark:toolchain
```

The suite measures:

- clean dependency installation in an isolated manifest-only workspace;
- warm dependency installation in the repository;
- Bun process startup and a small CPU loop;
- TypeScript version startup and the complete repository typecheck;
- Biome validation;
- the complete test suite;
- the repository build; and
- the production SEO build and audit.

Each sample records wall time, user and system CPU time, peak resident memory,
output size, page activity where the operating system exposes it, and exit
status. The harness uses `/usr/bin/time -l` on macOS and `/usr/bin/time -v` on
Linux. The runtime sample runs three times. Expensive repository commands run
once, so the report remains practical to reproduce.

The clean install uses the global package cache but creates a new `node_modules`
tree. It does not measure an empty network cache. The typecheck and build runs
remove the generated `apps/web/.next` directory and set `TURBO_FORCE=1` so Turbo
does not report a cached task as a compiler or bundler improvement. The harness
does not remove shared Turbo caches.

Use `BENCHMARK_SKIP` with comma-separated names for a partial run. For example:

```sh
BENCHMARK_SKIP=build:repository,build:seo-audit bun run benchmark:toolchain
```

The local SEO audit needs a usable `GITHUB_TOKEN` because the docs page loads
repository metadata during server rendering. The harness passes through that
token when it exists and never writes it to the report.

The executable that starts the harness is the executable measured in the
report. To compare two Bun versions, invoke the same script once with each
binary and save separate outputs. Bun’s installer supports side-by-side older
versions by setting `BUN_INSTALL` to a temporary directory before installation.

As of 2026-08-27, the npm stable tag resolves TypeScript to `7.0.2`, which this
repository already uses. TypeScript `7.2` is not a published stable version.
Bun `1.4.0` is the current stable release targeted by this change.
