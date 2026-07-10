# Production data migration

This plan moves the existing production dataset into the canonical BaseBlocks
model and then removes every transitional field, table, query path, and
migration function. It is deliberately staged so each destructive step follows
a verified checkpoint and a fresh backup.

No production migration starts from `main` as it exists today. The current
schema requires `sites.organizationId`, while production sites still contain
`teamId`. A transitional release must be built and tested first.

## Verified production baseline

The pre-migration backup is stored outside the repository at:

```text
/Users/naaiyy/Developer/BaseBlocks-backups/production-pre-canonical-migration-20260710T224709Z
```

It contains a valid Convex snapshot plus all 171 external S3 objects. The
backup manifest records snapshot identity, checksums, table counts, and
referential-integrity results.

The relevant production dataset is:

| Legacy source | Count | Canonical destination |
|---|---:|---|
| `teams` | 33 | Better Auth `organization` |
| `members` | 37 | Better Auth `member` |
| `sites.teamId` | 23 | `sites.organizationId` |
| `pages` | 101 | `pages` |
| `sections` | 99 | `pageContents.sections` |
| `columns` | 110 | nested page-content columns |
| `blocks` | 120 | nested page-content blocks |
| `assets` | 171 | `files` |
| `documents.assetId` | 93 | `documents.fileId` |
| `searchableContent` | 157 | canonical search entries |
| `deployments` | 106 | archive only; no product runtime table |
| `deploymentSnapshots` | 212 | archive only; no product runtime table |

All 23 sites have an unambiguous chain from `teamId` to an existing Better Auth
organization. All legacy memberships already have matching Better Auth
memberships. All inspected content and file references are intact.

## Safety rules

- Never use `convex import --replace`, `--replace-all`, or an empty JSONL file as
  a migration mechanism.
- Never run a production command without naming `--prod` and repeating the
  target deployment in the operator checklist.
- Take and verify a fresh Convex and object-storage backup before each
  destructive cleanup deployment.
- Migration functions are internal, idempotent, cursor-based, bounded, and
  independently verifiable.
- Do not deploy a schema that rejects the currently stored production shape.
- Do not remove a legacy source until every destination record and reference
  has passed parity verification.
- Stop immediately on a nonzero missing, mismatched, duplicate, or dangling
  count. Do not continue to cleanup.

## Stage 1: Build the transitional release

Create a dedicated migration branch from the deployed application version.
The transitional schema must temporarily accept both ownership fields:

- `sites.teamId?: Id<"teams">`
- `sites.organizationId?: string`
- retain `teams` and `members`
- retain `pageTabs`, `sections`, `columns`, and `blocks`
- retain `assets`, `documents.assetId`, `sites.logoAssetId`, and search
  `metadata.assetId`
- add `files`, `pageContents`, and the canonical search destination

All current reads must fail closed if neither ownership field resolves. Writes
must create only canonical fields. No new legacy data may be produced after
this release.

Add a single migration status query that reports every stage, cursor, source
count, destination count, mismatch count, and completion timestamp. Do not
infer completion from a function returning successfully.

## Stage 2: Rehearse on an isolated deployment

Restore the verified production Convex snapshot into a disposable preview or
separate staging deployment. Restore the external object archive into an
isolated bucket, preserving object keys. Never point rehearsal code at the
production bucket.

Run the exact migration sequence below. Verify the application against the
restored dataset, including representative private/public sites, nested pages,
libraries, PDFs, images, search, and Better Auth permissions. Repeat the full
rehearsal from a fresh restore until it is deterministic and retry-safe.

Record expected counts and a digest of canonical content so the production run
has a fixed acceptance target.

## Stage 3: Migrate organization ownership

For each site:

1. Resolve its legacy `teamId`.
2. Read that team's `organizationId`.
3. Confirm the Better Auth organization exists.
4. Patch `sites.organizationId` only when absent.
5. Reject conflicting existing values rather than overwriting them.

Verification must prove:

- 23 sites checked
- zero sites without `organizationId`
- zero missing legacy teams
- zero missing Better Auth organizations
- zero conflicting organization mappings
- every site is visible only to members of its mapped organization

The legacy `teams` and `members` tables remain untouched during this stage.

## Stage 4: Migrate canonical page content

Run the existing page-content transformation in bounded batches. Preserve tab,
section, column, and block stable IDs, ordering, regions, types, and content.
Retries skip an existing `pageContents` record only after comparing it with the
expected legacy projection; an existing mismatch is an error, not a skip.

Verification must traverse all 101 pages and prove:

- one `pageContents` record per page
- zero missing or duplicate records
- exact structural parity for tabs, sections, columns, blocks, order, and IDs
- every page-content `siteId` matches its page
- the editor and published renderer produce the same representative pages

## Stage 5: Migrate file metadata

Run the existing `assets -> files` migration, keyed by `legacyAssetId` and
`objectKey`. No file bytes need to move because the canonical Files SDK uses the
same production bucket and object keys. Before patching references, use the
storage service to verify every referenced object exists and matches its stored
size; checksum when the provider exposes it.

Then patch:

- `documents.assetId -> documents.fileId`
- `sites.logoAssetId -> sites.logoFileId`
- search `metadata.assetId -> metadata.fileId`

Verification must prove:

- 171 assets map one-to-one to 171 files
- zero duplicate object keys or legacy mappings
- all 93 documents have valid `fileId` references
- the site logo reference resolves
- all 93 search file references resolve
- zero missing storage objects and zero size/checksum mismatches
- private/public download authorization remains correct

## Stage 6: Rebuild canonical search

Create search records from authoritative pages, page contents, documents, and
files. Do not copy signed URLs or preserve legacy synchronization state.
Canonical records contain only site, kind, source ID, title, derived text, and
update time.

Verification compares source IDs against all indexable pages and documents,
checks authorization for private and public search, and reports zero orphaned
or duplicate search records.

## Stage 7: Production execution

Before execution:

1. Confirm the deployment is `quiet-alligator-768`.
2. Confirm the dashboard backup and local backup checksums are available.
3. Confirm the rehearsed commit SHA and expected counts.
4. Disable schema-changing parallel work.
5. Deploy only the transitional schema and migration functions.

Run stages in strict order: ownership, page content, file metadata, search.
After every stage, run its verifier and save the JSON result. The application
may be deployed only after all verifiers return zero failures.

## Stage 8: Manual acceptance

Exercise real migrated records before cleanup:

- sign in and switch organizations
- open several existing sites from different organizations
- edit and publish nested pages
- inspect representative tabs, layouts, and every block family
- open libraries, folders, documents, PDFs, and images
- search private and public content
- open subdomain and custom-domain published sites
- verify another organization cannot read or mutate the data

Keep the transitional release deployed until this acceptance is complete.

## Stage 9: Remove every legacy path

Take another verified production backup. Then, in separate cleanup commits:

1. Remove read fallbacks and legacy write support.
2. Make `sites.organizationId` required and remove `teamId`.
3. Remove `teams` and `members` after Better Auth parity is rechecked.
4. Remove `pageTabs`, `sections`, `columns`, and `blocks`.
5. Remove `assets`, `legacyAssetId`, `assetId`, and `logoAssetId`.
6. Remove `searchableContent` after canonical search parity passes.
7. Remove obsolete deployment/snapshot runtime code and tables; retain their
   history only in the verified backup.
8. Delete migration functions, transitional validators, indexes, comments, and
   generated API entries.
9. Run unused dependency/export scans and regenerate Convex bindings.

The final schema and application must contain no compatibility aliases,
fallback reads, legacy tables, legacy fields, dual writes, migration feature
flags, or production migration endpoints.

## Final verification

- formatting and lint
- full TypeScript checks
- Convex code generation
- production build
- schema deployment dry run against a restored snapshot
- every migration verifier at zero failures
- authorization/security audit
- object-storage integrity audit
- full manual acceptance
- fresh post-migration backup and checksum manifest
- `rg` audit for every removed legacy concept
- clean Git worktree and tagged migration commit

