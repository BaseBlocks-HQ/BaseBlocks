# Publication manifest migration

`publicationMigrations` backfills data required by the atomic publication
path. It is resumable and supports `dryRun` and `apply` modes.

The migration processes these phases in order:

1. Add `searchText` to historical content revisions.
2. Add bounded `description` values to release pages.
3. Capture immutable `extractedText` on historical release files.
4. Add `releaseId` to legacy release search entries.
5. Rebuild the live search scope for every currently live site.

The migration does not delete legacy fields or old per-release search entries.
Those are removed only after every environment has been migrated and verified.

## Run a preview migration

Run these commands from `packages/backend` against the Convex deployment used by
the preview deployment. Use a unique run ID for each mode.

```sh
bunx convex run --deployment <preview-deployment> publicationMigrations:runBatch \
  '{"runId":"publication-preview-dry-YYYYMMDD","mode":"dryRun"}'

bunx convex run --deployment <preview-deployment> publicationMigrations:getReport \
  '{"runId":"publication-preview-dry-YYYYMMDD"}'
```

Wait for `status` to become `completed`. Apply only when the dry run reports
`errorCount: 0`. `migratedCount` counts records that need backfilling;
`scheduledCount` counts live-search rebuilds that will be scheduled.

```sh
bunx convex run --deployment <preview-deployment> publicationMigrations:runBatch \
  '{"runId":"publication-preview-apply-YYYYMMDD","mode":"apply"}'

bunx convex run --deployment <preview-deployment> publicationMigrations:getReport \
  '{"runId":"publication-preview-apply-YYYYMMDD"}'
```

The batch function schedules its next batch automatically. A repeated command
with the same completed run ID is an idempotent no-op.

After the apply run completes, verify that revisions, release pages, release
files, and release search entries have the new fields. Also wait for every
scheduled live-search projection to finish before testing published search.

## Production gate

Before applying in production:

1. Take and verify a Convex backup.
2. Run the production dry run.
3. Investigate every migration error.
4. Record the dry-run report.
5. Apply the migration only after the preview verification passes.

Do not remove compatibility code until all environments have completed the
backfill and the old record shapes have been separately audited.
