# BaseBlocks backend

## AnyDoc file-extraction deployment

File ingestion runs in a Convex Node action. Convex does not inherit variables
from the web/Vercel deployment, so configure the storage credentials separately
for every Convex deployment before enabling the extraction cron.

From `packages/backend`, set the same Files SDK S3 configuration used by the web
application:

```sh
bunx convex env set FILES_ADAPTER s3
bunx convex env set FILES_BUCKET '<bucket>'
bunx convex env set FILES_ENDPOINT '<endpoint>'
bunx convex env set FILES_REGION '<region>'
bunx convex env set FILES_FORCE_PATH_STYLE true
bunx convex env set FILES_ACCESS_KEY_ID '<access-key-id>'
bunx convex env set FILES_SECRET_ACCESS_KEY '<secret-access-key>'
```

Do not copy `FILES_API_SECRET`; extraction talks to object storage through the
Files SDK and does not call the web upload API.

After deploying, run the preflight against the target Convex deployment:

```sh
bunx convex run deploymentPreflight:checkFileExtractionEnvironment
```

The check returns only variable names and non-secret configuration. It also
loads the AnyDoc native Node binding so a missing registry package or platform
binary fails before extraction jobs are processed.

`convex.json` externalizes only `@baseblocks/anydoc`; keep that dependency pinned
to the exact registry version verified by the application lockfile.

The `start existing file extraction backfill` cron starts the one-time,
idempotent existing-file backfill automatically. It persists its cursor in
`maintenanceJobs`, resumes stale runs, and becomes a no-op after completion. To
start it immediately after deployment instead of waiting for the cron interval:

```sh
bunx convex run migrations:startFileExtractionBackfill
```

If a deployment preflight initially failed after jobs had already run, restart
the completed scan after fixing the environment. Ready extractions are reused;
failed or missing extractions are queued again:

```sh
bunx convex run migrations:startFileExtractionBackfill '{"forceRestart":true}'
```
