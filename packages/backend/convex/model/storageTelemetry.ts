import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type MutationCtx = Pick<GenericMutationCtx<DataModel>, "db">;
type StorageEventKind =
  | "upload"
  | "softDelete"
  | "restore"
  | "purge"
  | "contentCreate"
  | "reconcileAdjustment";

export async function recordStorageUsageEvent(
  ctx: MutationCtx,
  input: {
    organizationId: string;
    siteId?: Id<"sites">;
    actorId?: string;
    fileId?: Id<"files">;
    contentRevisionId?: Id<"contentRevisions">;
    kind: StorageEventKind;
    bytes: number;
    idempotencyKey: string;
    now?: number;
  },
) {
  if (!Number.isSafeInteger(input.bytes) || input.bytes < 0) {
    throw new Error("Storage telemetry bytes must be a non-negative integer");
  }
  const duplicate = await ctx.db
    .query("storageUsageEvents")
    .withIndex("by_org_idempotency", (q) =>
      q
        .eq("organizationId", input.organizationId)
        .eq("idempotencyKey", input.idempotencyKey),
    )
    .unique();
  if (duplicate) return duplicate._id;
  const bytes = BigInt(input.bytes);
  const now = input.now ?? Date.now();
  const current = await ctx.db
    .query("workspaceStorageUsage")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", input.organizationId),
    )
    .unique();
  const usage = current ?? {
    activeFileBytes: 0n,
    retainedFileBytes: 0n,
    contentPayloadBytes: 0n,
    logicalRevisionBytes: 0n,
    activeFileCount: 0,
    retainedFileCount: 0,
    contentPayloadCount: 0,
  };
  let activeFileBytes = usage.activeFileBytes;
  let retainedFileBytes = usage.retainedFileBytes;
  let contentPayloadBytes = usage.contentPayloadBytes;
  let logicalRevisionBytes = usage.logicalRevisionBytes;
  let activeFileCount = usage.activeFileCount;
  let retainedFileCount = usage.retainedFileCount;
  let contentPayloadCount = usage.contentPayloadCount;
  let logicalBytesDelta = 0n;
  let storedBytesDelta = 0n;
  let objectCountDelta = 0n;
  if (input.kind === "upload") {
    activeFileBytes += bytes;
    activeFileCount += 1;
    logicalBytesDelta = bytes;
    storedBytesDelta = bytes;
    objectCountDelta = 1n;
  } else if (input.kind === "softDelete") {
    activeFileBytes -= bytes;
    retainedFileBytes += bytes;
    activeFileCount -= 1;
    retainedFileCount += 1;
    logicalBytesDelta = -bytes;
  } else if (input.kind === "restore") {
    activeFileBytes += bytes;
    retainedFileBytes -= bytes;
    activeFileCount += 1;
    retainedFileCount -= 1;
    logicalBytesDelta = bytes;
  } else if (input.kind === "purge") {
    retainedFileBytes -= bytes;
    retainedFileCount -= 1;
    storedBytesDelta = -bytes;
    objectCountDelta = -1n;
  } else if (input.kind === "contentCreate") {
    contentPayloadBytes += bytes;
    logicalRevisionBytes += bytes;
    contentPayloadCount += 1;
    logicalBytesDelta = bytes;
    storedBytesDelta = bytes;
    objectCountDelta = 1n;
  }
  for (const value of [
    activeFileBytes,
    retainedFileBytes,
    contentPayloadBytes,
  ]) {
    if (value < 0n) throw new Error("Storage telemetry projection underflow");
  }
  const eventId = await ctx.db.insert("storageUsageEvents", {
    organizationId: input.organizationId,
    siteId: input.siteId,
    actorId: input.actorId,
    fileId: input.fileId,
    contentRevisionId: input.contentRevisionId,
    kind: input.kind,
    logicalBytesDelta,
    storedBytesDelta,
    objectCountDelta,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
  });
  const value = {
    organizationId: input.organizationId,
    activeFileBytes,
    retainedFileBytes,
    contentPayloadBytes,
    logicalRevisionBytes,
    activeFileCount,
    retainedFileCount,
    contentPayloadCount,
    lastEventAt: now,
    reconciliationVersion: "storage-v1",
    updatedAt: now,
  };
  if (current) await ctx.db.patch(current._id, value);
  else
    await ctx.db.insert("workspaceStorageUsage", { ...value, createdAt: now });
  return eventId;
}

export async function recordSiteStoragePurge(
  ctx: MutationCtx,
  input: {
    organizationId: string;
    siteId: Id<"sites">;
    idempotencyKey: string;
    now?: number;
  },
) {
  const duplicate = await ctx.db
    .query("storageUsageEvents")
    .withIndex("by_org_idempotency", (q) =>
      q
        .eq("organizationId", input.organizationId)
        .eq("idempotencyKey", input.idempotencyKey),
    )
    .unique();
  if (duplicate) return duplicate._id;
  const usage = await ctx.db
    .query("workspaceStorageUsage")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", input.organizationId),
    )
    .unique();
  if (!usage) return null;
  const [files, payloads, revisions] = await Promise.all([
    ctx.db
      .query("files")
      .withIndex("by_site", (q) => q.eq("siteId", input.siteId))
      .collect(),
    ctx.db
      .query("contentPayloads")
      .withIndex("by_site_hash", (q) => q.eq("siteId", input.siteId))
      .collect(),
    ctx.db
      .query("contentRevisions")
      .withIndex("by_site_hash", (q) => q.eq("siteId", input.siteId))
      .collect(),
  ]);
  const activeFiles = files.filter((file) => file.deletedAt === undefined);
  const retainedFiles = files.filter((file) => file.deletedAt !== undefined);
  const activeFileBytes = activeFiles.reduce(
    (sum, file) => sum + BigInt(file.size),
    0n,
  );
  const retainedFileBytes = retainedFiles.reduce(
    (sum, file) => sum + BigInt(file.size),
    0n,
  );
  const payloadBytes = payloads.reduce(
    (sum, payload) => sum + BigInt(payload.contentSize),
    0n,
  );
  const revisionBytes = revisions.reduce(
    (sum, revision) => sum + BigInt(revision.contentSize),
    0n,
  );
  const now = input.now ?? Date.now();
  const eventId = await ctx.db.insert("storageUsageEvents", {
    organizationId: input.organizationId,
    siteId: input.siteId,
    kind: "reconcileAdjustment",
    logicalBytesDelta: -(activeFileBytes + revisionBytes),
    storedBytesDelta: -(activeFileBytes + retainedFileBytes + payloadBytes),
    objectCountDelta: -BigInt(files.length + payloads.length),
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
  });
  await ctx.db.patch(usage._id, {
    activeFileBytes:
      usage.activeFileBytes >= activeFileBytes
        ? usage.activeFileBytes - activeFileBytes
        : 0n,
    retainedFileBytes:
      usage.retainedFileBytes >= retainedFileBytes
        ? usage.retainedFileBytes - retainedFileBytes
        : 0n,
    contentPayloadBytes:
      usage.contentPayloadBytes >= payloadBytes
        ? usage.contentPayloadBytes - payloadBytes
        : 0n,
    logicalRevisionBytes:
      usage.logicalRevisionBytes >= revisionBytes
        ? usage.logicalRevisionBytes - revisionBytes
        : 0n,
    activeFileCount: Math.max(0, usage.activeFileCount - activeFiles.length),
    retainedFileCount: Math.max(
      0,
      usage.retainedFileCount - retainedFiles.length,
    ),
    contentPayloadCount: Math.max(
      0,
      usage.contentPayloadCount - payloads.length,
    ),
    lastEventAt: now,
    reconciliationVersion: "storage-v1",
    updatedAt: now,
  });
  return eventId;
}
