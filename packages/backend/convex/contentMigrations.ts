import { migrateDirectoryContentV1 } from "@baseblocks/custom-blocks";
import { getConvexSize, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import {
  hashOpenEditorContent,
  parseOpenEditorDocument,
} from "./pageContentFormat";
import {
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { queuePageContentIndex } from "./search";
import { recordStorageUsageEvent } from "./model/storageTelemetry";

const DIRECTORY_MIGRATION_KEY = "directory-v1-to-v2";

type MigrationValue = {
  value: unknown;
  migratedCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function migrateDirectoryBlocks(value: unknown): MigrationValue {
  if (Array.isArray(value)) {
    let migratedCount = 0;
    const next = value.map((item) => {
      const result = migrateDirectoryBlocks(item);
      migratedCount += result.migratedCount;
      return result.value;
    });
    return { value: next, migratedCount };
  }
  if (!isRecord(value)) return { value, migratedCount: 0 };

  let migratedCount = 0;
  let next: Record<string, unknown> = { ...value };
  const attrs = value.attrs;
  if (
    value.type === "customBlock" &&
    isRecord(attrs) &&
    attrs.blockId === "baseblocks.directory" &&
    attrs.version === 1
  ) {
    next = {
      ...next,
      attrs: {
        ...attrs,
        version: 2,
        data: migrateDirectoryContentV1(attrs.data),
      },
    };
    migratedCount += 1;
  }

  for (const [key, child] of Object.entries(next)) {
    if (!child || typeof child !== "object") continue;
    const result = migrateDirectoryBlocks(child);
    if (result.migratedCount === 0) continue;
    next = { ...next, [key]: result.value };
    migratedCount += result.migratedCount;
  }
  return { value: next, migratedCount };
}

export function migrateDirectoryDocument(value: string): {
  content: string;
  migratedCount: number;
} | null {
  const decoded = JSON.parse(value) as unknown;
  const migrated = migrateDirectoryBlocks(decoded);
  if (migrated.migratedCount === 0) return null;
  const document = parseOpenEditorDocument(migrated.value);
  return {
    content: JSON.stringify(document),
    migratedCount: migrated.migratedCount,
  };
}

async function scheduleNext(
  ctx: Pick<MutationCtx, "scheduler">,
  migrationId: Id<"directoryDataMigrations">,
) {
  await ctx.scheduler.runAfter(0, internal.contentMigrations.runBatch, {
    migrationId,
  });
}

export const startDirectoryMigration = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");
    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "library",
      action: "manage",
    });

    const existing = await ctx.db
      .query("directoryDataMigrations")
      .withIndex("by_key_organization", (q) =>
        q
          .eq("migrationKey", DIRECTORY_MIGRATION_KEY)
          .eq("organizationId", site.organizationId),
      )
      .unique();
    if (existing?.status === "running" || existing?.status === "completed") {
      return existing;
    }

    const siteIds = (
      await ctx.db
        .query("sites")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", site.organizationId),
        )
        .collect()
    ).map(({ _id }) => _id);
    const now = Date.now();
    const migrationId = existing
      ? existing._id
      : await ctx.db.insert("directoryDataMigrations", {
          migrationKey: DIRECTORY_MIGRATION_KEY,
          organizationId: site.organizationId,
          siteIds,
          siteIndex: 0,
          status: "running",
          scannedCount: 0,
          migratedCount: 0,
          startedAt: now,
          updatedAt: now,
        });
    if (existing) {
      await ctx.db.patch(existing._id, {
        siteIds,
        siteIndex: 0,
        cursor: undefined,
        status: "running",
        scannedCount: 0,
        migratedCount: 0,
        startedAt: now,
        updatedAt: now,
        completedAt: undefined,
        failure: undefined,
      });
    }
    await scheduleNext(ctx, migrationId);
    return await ctx.db.get(migrationId);
  },
});

export const getDirectoryMigration = query({
  args: { migrationId: v.id("directoryDataMigrations") },
  handler: async (ctx, { migrationId }) => {
    const migration = await ctx.db.get(migrationId);
    if (!migration) return null;
    await requireOrganizationMember(ctx, migration.organizationId);
    return migration;
  },
});

export const runBatch = internalMutation({
  args: { migrationId: v.id("directoryDataMigrations") },
  handler: async (ctx, { migrationId }) => {
    const migration = await ctx.db.get(migrationId);
    if (migration?.status !== "running") return migration;
    const siteId = migration.siteIds[migration.siteIndex];
    if (!siteId) {
      const completedAt = Date.now();
      await ctx.db.patch(migrationId, {
        status: "completed",
        updatedAt: completedAt,
        completedAt,
      });
      return await ctx.db.get(migrationId);
    }

    try {
      const page = await ctx.db
        .query("contentPayloads")
        .withIndex("by_site_hash", (q) => q.eq("siteId", siteId))
        .paginate({ cursor: migration.cursor ?? null, numItems: 1 });
      let migratedCount = migration.migratedCount;
      if (page.page[0]) {
        const payload = page.page[0];
        const migrated = payload.content.includes('"columnIds"')
          ? migrateDirectoryDocument(payload.content)
          : null;
        if (migrated) {
          const contentSize = getConvexSize(migrated.content);
          const contentHash = hashOpenEditorContent(migrated.content);
          let revision = await ctx.db
            .query("contentRevisions")
            .withIndex("by_site_hash", (q) =>
              q.eq("siteId", siteId).eq("contentHash", contentHash),
            )
            .first();
          const oldRevisions = await ctx.db
            .query("contentRevisions")
            .withIndex("by_payload", (q) => q.eq("payloadId", payload._id))
            .collect();
          const source = oldRevisions[0];
          if (source) {
            if (!revision) {
              const newPayloadId = await ctx.db.insert("contentPayloads", {
                siteId,
                contentHash,
                contentSize,
                content: migrated.content,
                createdAt: Date.now(),
              });
              const revisionId = await ctx.db.insert("contentRevisions", {
                siteId,
                contentHash,
                contentSize,
                payloadId: newPayloadId,
                libraryIds: source.libraryIds,
                fileIds: source.fileIds,
                pageIds: source.pageIds,
                createdAt: Date.now(),
              });
              revision = await ctx.db.get(revisionId);
              if (revision) {
                const currentSite = await ctx.db.get(siteId);
                if (currentSite) {
                  await recordStorageUsageEvent(ctx, {
                    organizationId: currentSite.organizationId,
                    siteId,
                    contentRevisionId: revision._id,
                    kind: "contentCreate",
                    bytes: contentSize,
                    idempotencyKey: `content:migration:${revision._id}`,
                    now: Date.now(),
                  });
                }
              }
            }
            if (revision) {
              const now = Date.now();
              const pageDocuments = await ctx.db
                .query("pageDocuments")
                .withIndex("by_revision", (q) => q.eq("revisionId", source._id))
                .collect();
              for (const document of pageDocuments) {
                await ctx.db.patch(document._id, {
                  revisionId: revision._id,
                  contentHash,
                  contentSize,
                  updatedAt: now,
                });
                await queuePageContentIndex(ctx, document.pageId, revision._id);
              }
              const releasePages = await ctx.db
                .query("releasePages")
                .withIndex("by_content_revision", (q) =>
                  q.eq("contentRevisionId", source._id),
                )
                .collect();
              for (const releasePage of releasePages) {
                await ctx.db.patch(releasePage._id, {
                  contentRevisionId: revision._id,
                  contentHash,
                });
              }
              migratedCount += 1;
            }
          }
        }
      }

      const now = Date.now();
      const scannedCount = migration.scannedCount + page.page.length;
      const siteComplete = page.isDone;
      const nextSiteIndex = siteComplete
        ? migration.siteIndex + 1
        : migration.siteIndex;
      const complete =
        siteComplete && nextSiteIndex >= migration.siteIds.length;
      await ctx.db.patch(migrationId, {
        siteIndex: nextSiteIndex,
        cursor: siteComplete ? undefined : page.continueCursor,
        status: complete ? "completed" : "running",
        scannedCount,
        migratedCount,
        updatedAt: now,
        ...(complete ? { completedAt: now } : {}),
      });
      if (!complete) await scheduleNext(ctx, migrationId);
      return await ctx.db.get(migrationId);
    } catch (error) {
      const failure = error instanceof Error ? error.message : String(error);
      await ctx.db.patch(migrationId, {
        status: "failed",
        failure,
        updatedAt: Date.now(),
      });
      throw error;
    }
  },
});
