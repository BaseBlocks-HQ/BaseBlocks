# Canonical production migration rehearsal

## Current decision

**GO for a separately authorized production run, subject to the stop conditions
and fresh pre-run backup below.**

The Convex database slice has passed twice from pristine restores. Production
`quiet-alligator-768` was not modified.

## Fixed acceptance target

| Source/destination | Expected |
|---|---:|
| Legacy teams | 33 |
| Legacy members | 37 |
| Sites / canonical ownership | 23 |
| Pages / page contents | 101 |
| Sections | 99 |
| Columns | 110 |
| Blocks | 120 |
| Assets / files | 171 |
| Documents with files | 93 |
| Legacy search records | 157 |
| Canonical search records | 194 (101 pages + 93 documents) |

Snapshot audit digests:

```text
ownership    1fd4159b90773d09394af7ad6ef9b30c15be2fe2ce1f88393d61c7289d149944
pageContents 9af32d95431949a6beccdc4a22a7494d3cfd1d02374e4d82c74ffa7812088044
files        20c42c2520e1cf19c3cdb20fa264d6e4beeb0b3ce12c02bc42faf0a6233b373b
```

Run the offline audit with:

```sh
bun scripts/migration/snapshot-audit.ts \
  /Users/naaiyy/Developer/BaseBlocks-backups/production-pre-canonical-migration-20260710T224709Z/production.zip \
  /Users/naaiyy/Developer/BaseBlocks-backups/production-pre-canonical-migration-20260710T224709Z/objects/object-manifest.json
```

## Rehearsal evidence

Two isolated local Convex deployments were created from empty storage. For
each run, the legacy snapshot was imported with `--append` **before** deploying
the transitional schema. No replace flag was used.

Both final verifiers returned:

```json
{
  "counts": {
    "assets": 171,
    "canonicalSearch": 194,
    "documents": 93,
    "files": 171,
    "legacySearch": 157,
    "members": 37,
    "pageContents": 101,
    "pages": 101,
    "sites": 23,
    "teams": 33
  },
  "failures": {
    "conflictingOwnership": 0,
    "danglingDocumentFiles": 0,
    "documentsWithoutFiles": 0,
    "duplicateLegacyAssetMappings": 0,
    "duplicateObjectKeys": 0,
    "duplicatePageContents": 0,
    "duplicateSearchEntries": 0,
    "mismatchedPageContents": 0,
    "missingPageContents": 0,
    "orphanedSearchEntries": 0,
    "searchWithoutFiles": 0,
    "sitesWithoutLogoFiles": 0,
    "sitesWithoutOrganization": 0
  }
}
```

The second run's unified status query reported all stages complete, with zero
mismatches and destination counts 23, 101, 171, and 194. Retry execution made
zero ownership/file/reference writes and matched all 194 search records.

Authorization and application-boundary checks on the second restored dataset:

- all 23 sites and 37 legacy memberships were checked against 33 referenced
  Better Auth organizations;
- missing organizations, memberships, legacy teams, ownership fields,
  conflicts, and duplicate memberships were all zero;
- an actual member could read a migrated site and its migrated page content;
- a member of another organization and an anonymous identity received no site
  data;
- the cross-organization identity received an empty page-content result;
- authenticated search returned five representative results for `stage`, while
  the cross-organization identity returned zero;
- all 101 pages and 120 blocks passed storage-to-query hydration parity;
- all 11 rich-text and 4 decision-tree blocks were losslessly hydrated, with
  zero serialized markers escaping the public page-content query boundary.

The rehearsals found and fixed three production-relevant issues:

1. The snapshot must be imported before new canonical tables are created, or
   Convex table IDs can conflict.
2. Legacy search metadata contains `downloadUrl`; it must remain accepted by
   the transitional validator but is not copied into canonical search.
3. Nested rich-text and decision-tree payloads can exceed Convex's nesting
   limit after embedding. They are now losslessly serialized at rest and
   hydrated at application query boundaries.

## Storage rehearsal

A dedicated private Railway Storage Bucket named
`canonical-migration-rehearsal` was created in the Railway `development`
environment, region `ams`. The globally unique S3 bucket name is
`canonical-migration-rehearsal-66uixx`. Neither the development content bucket
nor the production content bucket was used.

The rehearsal was run with bucket-scoped credentials obtained directly from
the Railway CLI:

```sh
bun scripts/migration/rehearsal-storage.ts \
  /Users/naaiyy/Developer/BaseBlocks-backups/production-pre-canonical-migration-20260710T224709Z \
  canonical-migration-rehearsal-66uixx
```

The verifier uploaded every archived object, checked its remote metadata,
downloaded it again, recomputed its original MD5/SHA-256 checksum, and compared
an authoritative paginated S3 listing against the manifest. Result:

```json
{
  "expectedObjects": 171,
  "verifiedObjects": 171,
  "verifiedBytes": 100109437,
  "listedObjects": 171,
  "listedBytes": 100109437,
  "failures": []
}
```

Railway's high-level `bucket info` summary temporarily showed 165 objects and
95,452,936 bytes immediately after the bulk restore. The direct S3 listing and
171 successful read-back checks are the authoritative acceptance evidence;
the dashboard summary is eventually consistent.

## Production runbook (not yet authorized)

1. Repeat aloud and record deployment `quiet-alligator-768`.
2. Verify the pre-run Convex snapshot, object archive, and all SHA-256 values.
3. Record the rehearsed commit SHA and the acceptance target above.
4. Freeze schema-changing work and take a fresh verified backup.
5. Deploy only the transitional schema and internal migration functions.
6. Run ownership batches; save `migrationStatus` and `verifyCanonicalState`.
7. Run page-content batches; stop on any mismatch or nesting error.
8. Verify all 101 pages, then run the file stages in their fixed order.
9. Verify storage objects before accepting patched references.
10. Build page and document search entries; require 194 unique records.
11. Require every failure counter to equal zero and save all JSON outputs.
12. Perform the manual organization, editor, renderer, library, file, search,
    domain, and cross-organization authorization checks.
13. Keep the transitional release and all backups until manual acceptance.

Any nonzero missing, mismatched, duplicate, conflict, dangling, or storage
failure count is an immediate stop condition. Legacy cleanup and backup
deletion require separate authorization after production acceptance.
