# Convex I/O benchmark

This harness produces repeatable before/after measurements from Convex's own
`Completion` events. It covers page saves, published resolution/page/favicon
reads, draft status, release list/detail, library explorer, draft page reads,
page lists, and search. Draft-summary measurements cover the lightweight
always-live subscription; draft changes load only while the publish dialog is
open.

## Safety contract

- `prod` is query-only. The runner rejects mutation scenarios for production.
- Writes require all three gates: `--allow-writes`, an exact
  `--confirm-deployment` value, and `fixtureIsDisposable: true`.
- Use a dedicated benchmark organization/site/page. Save bursts intentionally
  leave that disposable page at the final generated revision.
- The identity is passed only to `convex run`; it is never written to reports.
- The runner never pushes code, deploys, imports, migrates, or deletes data.

## Configure a fixture

Copy `scripts/convex-io-benchmark.example.json` outside version control and
replace every placeholder. Function names and counts may be overridden:

```json
{
  "counts": { "save-burst": 10, "published-resolve": 100 },
  "functions": {
    "library-explorer": "libraries:getPublicExplorer",
    "search": "search:searchAllPublic"
  }
}
```

Set a scenario count to `0` to skip it. For a production read-only run,
`"save-burst": 0` is mandatory.

Set `savePayloadBytes` (recommended: `200000`) to keep save comparisons
representative. The generated text changes on every save and is capped at
800,000 bytes so it remains below the product document limit.

## Run and compare

Preview the exact calls without contacting Convex:

```sh
bun scripts/convex-io-benchmark.ts plan \
  --config /path/to/baseline.json \
  --out .artifacts/convex-io/baseline-plan.json
```

Run a query-only benchmark:

```sh
bun scripts/convex-io-benchmark.ts run \
  --config /path/to/production-readonly.json \
  --out .artifacts/convex-io/production-readonly.json
```

Run against a disposable dev or staging fixture:

```sh
bun scripts/convex-io-benchmark.ts run \
  --config /path/to/staging.json \
  --allow-writes \
  --confirm-deployment staging \
  --out .artifacts/convex-io/candidate-staging.json
```

Generate the recorded baseline/model and compare measured reports:

```sh
bun scripts/convex-io-benchmark.ts model \
  --out .artifacts/convex-io/recorded-model.json

bun scripts/convex-io-benchmark.ts compare \
  --before .artifacts/convex-io/baseline-staging.json \
  --after .artifacts/convex-io/candidate-staging.json \
  --out .artifacts/convex-io/comparison.json
```

## Measurement notes

The runner starts `convex logs --success --jsonl`, invokes functions
sequentially, waits for scheduled work, and aggregates these native usage
fields per semantic scenario:

- database I/O read/write bytes and documents read;
- text-index query/write-query bytes;
- storage bytes, egress, return bytes, cache hits, retries, and execution time.

Scheduled or unrelated functions observed in the same window are retained as
`background:<function>` instead of being silently attributed to a scenario.
Each report also contains `coverage.expected`, `coverage.observed`, and explicit
anomalies when the log stream did not capture exactly one completion per call.
Run against isolated preview/staging deployments for clean promotion evidence.
Production can contain unrelated concurrent traffic, so use it only as a
query-only smoke comparison and treat staging as the deterministic benchmark.

CLI wall time includes process startup and network latency; promotion decisions
should use the Convex execution usage, not that wall-clock total. Repeat each
profile at least three times and compare medians when the deployment is shared.
