# BaseBlocks backend

## AnyDoc file-extraction deployment

File ingestion runs in a Convex Node action scheduled by the AnyDoc Convex
adapter and Workpool. Convex does not inherit variables from the web/Vercel
deployment, so configure the storage credentials separately for every Convex
deployment.

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

The check returns only variable names and non-secret configuration. Convex
validates and installs the parser's Node dependency closure (`@firecrawl/anydoc`)
when the functions are deployed.

`convex.json` externalizes `@firecrawl/anydoc`, whose native NAPI binary must
stay out of the Convex bundle; keep it pinned to the exact registry version
verified by the application lockfile. `@baseblocks/anydoc-contracts` is pure
TypeScript and bundles normally. The extraction queue and its failure encoding
live in `convex/fileExtractionQueue.ts`; bounded parsing and failure
classification live in `convex/fileExtractionParser.ts`; the Node action handler
is in `convex/fileExtractionAction.ts`.
Uploads enqueue extraction immediately. Operators retry a terminal extraction
through the product's file-extraction retry action; there is no polling cron or
permanent backfill API.
