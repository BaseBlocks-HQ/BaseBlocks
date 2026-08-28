import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import {
  extractOpenEditorReferences,
  extractOpenEditorText,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "../pageContentFormat";
import { recordStorageUsageEvent } from "./storageTelemetry";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;

/**
 * Reads the denormalized text when present and rebuilds it for content
 * revisions written before `searchText` was added to the schema.
 */
export async function readContentRevisionSearchText(
  ctx: MutationCtx,
  revisionId: Id<"contentRevisions"> | undefined,
): Promise<string> {
  if (!revisionId) return "";
  const revision = await ctx.db.get(revisionId);
  if (!revision) return "";
  if (revision.searchText !== undefined) return revision.searchText;
  const payload = await ctx.db.get(revision.payloadId);
  if (!payload) return "";
  try {
    return extractOpenEditorText(parseOpenEditorDocument(payload.content));
  } catch {
    // Search is a derived projection. Omit malformed historical content here;
    // publication validates legacy payloads before activation.
    return "";
  }
}

export async function getOrCreateContentObject(
  ctx: MutationCtx,
  value: {
    siteId: Id<"sites">;
    content: string;
    contentHash: string;
    contentSize: number;
    document: OpenEditorDocument;
    createdAt: number;
  },
) {
  const existing = await ctx.db
    .query("contentRevisions")
    .withIndex("by_site_hash", (q) =>
      q.eq("siteId", value.siteId).eq("contentHash", value.contentHash),
    )
    .first();
  if (existing) {
    const payload = await ctx.db.get(existing.payloadId);
    if (!payload || payload.content !== value.content) {
      throw new Error("Content hash collision");
    }
    return {
      revisionId: existing._id,
      libraryIds: existing.libraryIds,
      fileIds: existing.fileIds,
      pageIds: existing.pageIds,
    };
  }

  const references = extractOpenEditorReferences(value.document);
  const libraryIds = Array.from(references.libraryIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("documentLibraries", id);
      return normalized ? [normalized] : [];
    })
    .sort();
  const fileIds = Array.from(references.fileIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("files", id);
      return normalized ? [normalized] : [];
    })
    .sort();
  const pageIds = Array.from(references.pageIds)
    .flatMap((id) => {
      const normalized = ctx.db.normalizeId("pages", id);
      return normalized ? [normalized] : [];
    })
    .sort();

  const payloadId = await ctx.db.insert("contentPayloads", {
    siteId: value.siteId,
    content: value.content,
    contentHash: value.contentHash,
    contentSize: value.contentSize,
    createdAt: value.createdAt,
  });
  const revisionId = await ctx.db.insert("contentRevisions", {
    siteId: value.siteId,
    contentHash: value.contentHash,
    contentSize: value.contentSize,
    payloadId,
    searchText: extractOpenEditorText(value.document),
    libraryIds,
    fileIds,
    pageIds,
    createdAt: value.createdAt,
  });
  const site = await ctx.db.get(value.siteId);
  if (!site) throw new Error("Site disappeared while recording content");
  await recordStorageUsageEvent(ctx, {
    organizationId: site.organizationId,
    siteId: site._id,
    contentRevisionId: revisionId,
    kind: "contentCreate",
    bytes: value.contentSize,
    idempotencyKey: `content:create:${revisionId}`,
    now: value.createdAt,
  });
  return { revisionId, libraryIds, fileIds, pageIds };
}
