# Workspace intent migration runbook

This migration adds application metadata only. It does not change Better Auth
organizations or memberships and does not create extra personal workspaces for
existing team members.

Classification is fixed:

- exactly one active Better Auth member: `personal`
- two or more active Better Auth members: `work`
- zero members: anomaly; report and skip

Existing `workspaceProfiles` rows are always skipped and never reclassified.

## Development dry run

Use one unique run ID and repeat the batch command until `status` is
`completed`. A dry run writes only the observable `workspaceMigrationRuns`
report; it never writes `workspaceProfiles`.

```sh
bunx convex run workspaceMigrations:runBatch '{"runId":"workspace-intent-dry-YYYYMMDD","mode":"dryRun"}'
bunx convex run workspaceMigrations:getReport '{"runId":"workspace-intent-dry-YYYYMMDD"}'
```

Investigate every non-zero `errorCount` before applying. The expected invariant
is `scannedCount = personalCount + workCount + skippedCount + errorCount`.

## Verified Development run

On 2026-08-09, Development deployment `dutiful-aardvark-750` completed the
following runs:

- `workspace-intent-dev-dry-20260809`: scanned 13, personal 13, work 0,
  skipped 0, created 0, errors 0.
- `workspace-intent-dev-apply-20260809`: scanned 13, personal 13, work 0,
  skipped 0, created 13, errors 0.
- Repeating the apply command with the same run ID returned the completed row
  unchanged.
- `workspace-intent-dev-dry-post-20260809`: scanned 13, personal 0, work 0,
  skipped 13, created 0, errors 0.

The Development database now contains 13 migration-sourced personal profiles.
No guest invitations or grants existed in the Development database during this
verification.

## Development apply

Use a new run ID for apply mode and repeat until complete:

```sh
bunx convex run workspaceMigrations:runBatch '{"runId":"workspace-intent-apply-YYYYMMDD","mode":"apply"}'
bunx convex run workspaceMigrations:getReport '{"runId":"workspace-intent-apply-YYYYMMDD"}'
```

Run a second dry run with another run ID. It should report all successfully
classified organizations as skipped and create no profiles.

## Production preparation

Production execution requires explicit approval. Before approval:

1. Deploy code that treats a missing profile as an unmigrated workspace.
2. Take and verify a Convex backup.
3. Record the current organization/member totals.
4. Complete a production dry run and save its report.
5. Resolve all zero-member anomalies.

Prepared production commands (do not run without approval):

```sh
bunx convex run --prod workspaceMigrations:runBatch '{"runId":"workspace-intent-prod-dry-YYYYMMDD","mode":"dryRun"}'
bunx convex run --prod workspaceMigrations:getReport '{"runId":"workspace-intent-prod-dry-YYYYMMDD"}'
bunx convex run --prod workspaceMigrations:runBatch '{"runId":"workspace-intent-prod-apply-YYYYMMDD","mode":"apply"}'
bunx convex run --prod workspaceMigrations:getReport '{"runId":"workspace-intent-prod-apply-YYYYMMDD"}'
```

## Failure, retry, and rollback

Each batch updates its checkpoint, counters, and inserted profiles atomically. Retry
the same command and run ID after a transient failure. A completed run is a
no-op when invoked again.

The migration is additive, so the preferred recovery is roll-forward: keep
missing-profile fallback enabled, correct the underlying membership anomaly,
and run a new dry-run/apply pair. Do not bulk-delete `workspaceProfiles`; that
could remove onboarding or lazy-personal metadata. If rollback is required,
restore the verified pre-migration Convex backup while the application version
that tolerates missing profiles remains deployed.
