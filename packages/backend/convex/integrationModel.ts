import { v } from "convex/values";
import type { GenericMutationCtx } from "convex/server";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { getNangoIntegrationId } from "./integrationNango";
import { integrationProvider } from "./validators/integrations";

const SYNC_STREAM = "contentMetadata";
const NANGO_SYNC_NAME = "content-metadata";
const NANGO_MODEL = "ContentMetadata";

export const getOrCreateAuthorizationIntent = internalMutation({
  args: {
    organizationId: v.string(),
    provider: integrationProvider,
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const candidates = await ctx.db
      .query("integrationConnections")
      .withIndex("by_organization_provider", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("provider", args.provider),
      )
      .collect();
    const existing = candidates.find(
      (connection) =>
        connection.createdBy === args.userId &&
        !connection.adapterConnectionId &&
        (connection.status === "awaitingAuthorization" ||
          connection.status === "error"),
    );

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "awaitingAuthorization",
        errorCode: undefined,
        errorMessage: undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("integrationConnections", {
      organizationId: args.organizationId,
      provider: args.provider,
      adapter: "nango",
      status: "awaitingAuthorization",
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
      resourceCount: 0,
    });
  },
});

export const markAuthorizationStartFailed = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection?.status !== "awaitingAuthorization") return;
    await ctx.db.patch(args.connectionId, {
      status: "error",
      errorCode: "authorization_start_failed",
      errorMessage: args.message,
      updatedAt: Date.now(),
    });
  },
});

export const getConnectionForOperation = internalQuery({
  args: { connectionId: v.id("integrationConnections") },
  handler: async (ctx, args) => await ctx.db.get(args.connectionId),
});

export const markDisconnecting = internalMutation({
  args: { connectionId: v.id("integrationConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.status === "disconnected") return;
    await ctx.db.patch(args.connectionId, {
      status: "disconnecting",
      updatedAt: Date.now(),
      errorCode: undefined,
      errorMessage: undefined,
    });
  },
});

export const finishDisconnect = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(
      args.connectionId,
      args.errorMessage
        ? {
            status: "error",
            errorCode: "disconnect_failed",
            errorMessage: args.errorMessage,
            updatedAt: now,
          }
        : {
            status: "disconnected",
            disconnectedAt: now,
            errorCode: undefined,
            errorMessage: undefined,
            updatedAt: now,
          },
    );
  },
});

export const recordAuthorizationWebhook = internalMutation({
  args: {
    intentId: v.string(),
    organizationId: v.optional(v.string()),
    adapterConnectionId: v.string(),
    integrationId: v.string(),
    operation: v.string(),
    success: v.boolean(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const connectionId = ctx.db.normalizeId(
      "integrationConnections",
      args.intentId,
    );
    if (!connectionId) return;
    const connection = await ctx.db.get(connectionId);
    if (connection?.adapter !== "nango") return;
    if (
      args.organizationId &&
      args.organizationId !== connection.organizationId
    ) {
      return;
    }
    if (args.integrationId !== getNangoIntegrationId(connection.provider)) {
      return;
    }
    if (
      connection.adapterConnectionId &&
      connection.adapterConnectionId !== args.adapterConnectionId
    ) {
      return;
    }

    const now = Date.now();
    if (
      args.success &&
      (args.operation === "creation" || args.operation === "override")
    ) {
      await ctx.db.patch(connectionId, {
        adapterConnectionId: args.adapterConnectionId,
        status: "active",
        connectedAt: connection.connectedAt ?? now,
        errorCode: undefined,
        errorMessage: undefined,
        updatedAt: now,
      });
      return;
    }

    if (!args.success) {
      await ctx.db.patch(connectionId, {
        status: "error",
        errorCode: args.errorCode ?? "authorization_failed",
        errorMessage: args.errorMessage ?? "Authorization failed.",
        updatedAt: now,
      });
    }
  },
});

async function findConnectionByAdapterId(
  ctx: GenericMutationCtx<DataModel>,
  adapterConnectionId: string,
) {
  return await ctx.db
    .query("integrationConnections")
    .withIndex("by_adapter_connection", (q) =>
      q.eq("adapter", "nango").eq("adapterConnectionId", adapterConnectionId),
    )
    .unique();
}

export const queueNangoSync = internalMutation({
  args: {
    adapterConnectionId: v.string(),
    integrationId: v.string(),
    syncName: v.string(),
    model: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const connection = await findConnectionByAdapterId(
      ctx,
      args.adapterConnectionId,
    );
    if (connection?.status !== "active") return;
    if (args.integrationId !== getNangoIntegrationId(connection.provider)) {
      return;
    }
    if (args.syncName !== NANGO_SYNC_NAME || args.model !== NANGO_MODEL) return;

    const state = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_connection_stream", (q) =>
        q.eq("connectionId", connection._id).eq("stream", SYNC_STREAM),
      )
      .unique();
    const now = Date.now();

    if (!args.success) {
      if (state) {
        await ctx.db.patch(state._id, {
          status: "error",
          errorMessage: args.errorMessage ?? "External sync failed.",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("integrationSyncStates", {
          connectionId: connection._id,
          stream: SYNC_STREAM,
          model: NANGO_MODEL,
          status: "error",
          rerunRequested: false,
          attempt: 0,
          errorMessage: args.errorMessage ?? "External sync failed.",
          updatedAt: now,
        });
      }
      return;
    }

    if (state && (state.status === "queued" || state.status === "running")) {
      await ctx.db.patch(state._id, {
        rerunRequested: true,
        updatedAt: now,
      });
      return;
    }

    if (state) {
      await ctx.db.patch(state._id, {
        status: "queued",
        rerunRequested: false,
        attempt: 0,
        errorMessage: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("integrationSyncStates", {
        connectionId: connection._id,
        stream: SYNC_STREAM,
        model: NANGO_MODEL,
        status: "queued",
        rerunRequested: false,
        attempt: 0,
        updatedAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, internal.integrations.pullNangoRecords, {
      connectionId: connection._id,
      stream: SYNC_STREAM,
    });
  },
});

export const recordConnectionAuthFailure = internalMutation({
  args: {
    adapterConnectionId: v.string(),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const connection = await findConnectionByAdapterId(
      ctx,
      args.adapterConnectionId,
    );
    if (!connection || connection.status === "disconnected") return;
    await ctx.db.patch(connection._id, {
      status: "error",
      errorCode: args.errorCode ?? "credentials_invalid",
      errorMessage: args.errorMessage ?? "Reconnect this integration.",
      updatedAt: Date.now(),
    });
  },
});

export const recordSyncRequestFailed = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.status === "disconnected") return;
    const state = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_connection_stream", (q) =>
        q.eq("connectionId", args.connectionId).eq("stream", SYNC_STREAM),
      )
      .unique();
    const update = {
      status: "error" as const,
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    };
    if (state) {
      await ctx.db.patch(state._id, update);
      return;
    }
    await ctx.db.insert("integrationSyncStates", {
      connectionId: args.connectionId,
      stream: SYNC_STREAM,
      model: NANGO_MODEL,
      rerunRequested: false,
      attempt: 0,
      ...update,
    });
  },
});

export const claimSync = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    stream: v.string(),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (connection?.status !== "active" || !connection.adapterConnectionId) {
      return null;
    }
    const state = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_connection_stream", (q) =>
        q.eq("connectionId", args.connectionId).eq("stream", args.stream),
      )
      .unique();
    if (state?.status !== "queued") return null;

    const now = Date.now();
    await ctx.db.patch(state._id, {
      status: "running",
      startedAt: now,
      updatedAt: now,
      errorMessage: undefined,
    });
    return {
      adapterConnectionId: connection.adapterConnectionId,
      cursor: state.cursor,
      model: state.model,
      provider: connection.provider,
    };
  },
});

const normalizedResource = v.object({
  externalId: v.string(),
  resourceType: v.string(),
  title: v.string(),
  url: v.optional(v.string()),
  parentExternalId: v.optional(v.string()),
  providerCreatedAt: v.optional(v.string()),
  providerUpdatedAt: v.optional(v.string()),
  deleted: v.boolean(),
});

export const applyResourceBatch = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    stream: v.string(),
    resources: v.array(normalizedResource),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return;
    const now = Date.now();
    let resourceCountDelta = 0;

    for (const resource of args.resources) {
      const existing = await ctx.db
        .query("integrationResources")
        .withIndex("by_connection_external", (q) =>
          q
            .eq("connectionId", args.connectionId)
            .eq("externalId", resource.externalId),
        )
        .unique();
      const fields = {
        resourceType: resource.resourceType,
        title: resource.title,
        url: resource.url,
        parentExternalId: resource.parentExternalId,
        providerCreatedAt: resource.providerCreatedAt,
        providerUpdatedAt: resource.providerUpdatedAt,
        deletedAt: resource.deleted ? now : undefined,
        updatedAt: now,
      };
      if (existing) {
        if (existing.deletedAt && !resource.deleted) {
          resourceCountDelta += 1;
        } else if (!existing.deletedAt && resource.deleted) {
          resourceCountDelta -= 1;
        }
        await ctx.db.patch(existing._id, fields);
      } else {
        if (!resource.deleted) resourceCountDelta += 1;
        await ctx.db.insert("integrationResources", {
          organizationId: connection.organizationId,
          connectionId: connection._id,
          provider: connection.provider,
          externalId: resource.externalId,
          createdAt: now,
          ...fields,
        });
      }
    }

    if (resourceCountDelta !== 0) {
      await ctx.db.patch(connection._id, {
        resourceCount: Math.max(
          0,
          connection.resourceCount + resourceCountDelta,
        ),
        updatedAt: now,
      });
    }

    if (args.cursor) {
      const state = await ctx.db
        .query("integrationSyncStates")
        .withIndex("by_connection_stream", (q) =>
          q.eq("connectionId", args.connectionId).eq("stream", args.stream),
        )
        .unique();
      if (state) {
        await ctx.db.patch(state._id, {
          cursor: args.cursor,
          updatedAt: now,
        });
      }
    }
  },
});

export const completeSync = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    stream: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_connection_stream", (q) =>
        q.eq("connectionId", args.connectionId).eq("stream", args.stream),
      )
      .unique();
    if (!state) return;

    const now = Date.now();
    await ctx.db.patch(args.connectionId, {
      lastSyncAt: now,
      updatedAt: now,
    });

    if (state.rerunRequested) {
      await ctx.db.patch(state._id, {
        status: "queued",
        rerunRequested: false,
        attempt: 0,
        completedAt: now,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.integrations.pullNangoRecords, {
        connectionId: args.connectionId,
        stream: args.stream,
      });
      return;
    }

    await ctx.db.patch(state._id, {
      status: "idle",
      attempt: 0,
      completedAt: now,
      errorMessage: undefined,
      updatedAt: now,
    });
  },
});

export const continueSync = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    stream: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_connection_stream", (q) =>
        q.eq("connectionId", args.connectionId).eq("stream", args.stream),
      )
      .unique();
    if (state?.status !== "running") return;
    await ctx.db.patch(state._id, {
      status: "queued",
      attempt: 0,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.integrations.pullNangoRecords,
      args,
    );
  },
});

export const failSync = internalMutation({
  args: {
    connectionId: v.id("integrationConnections"),
    stream: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_connection_stream", (q) =>
        q.eq("connectionId", args.connectionId).eq("stream", args.stream),
      )
      .unique();
    if (!state) return;
    const attempt = state.attempt + 1;
    const now = Date.now();
    if (attempt >= 5) {
      await ctx.db.patch(state._id, {
        status: "error",
        attempt,
        errorMessage: args.errorMessage,
        updatedAt: now,
      });
      return;
    }

    await ctx.db.patch(state._id, {
      status: "queued",
      attempt,
      errorMessage: args.errorMessage,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      Math.min(60_000, 1000 * 2 ** attempt),
      internal.integrations.pullNangoRecords,
      {
        connectionId: args.connectionId,
        stream: args.stream,
      },
    );
  },
});

export const recoverStalledSyncs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const queuedBefore = now - 60_000;
    const runningBefore = now - 15 * 60_000;
    const staleQueued = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_status_updated", (q) =>
        q.eq("status", "queued").lt("updatedAt", queuedBefore),
      )
      .take(100);
    const staleRunning = await ctx.db
      .query("integrationSyncStates")
      .withIndex("by_status_updated", (q) =>
        q.eq("status", "running").lt("updatedAt", runningBefore),
      )
      .take(100);

    for (const state of [...staleQueued, ...staleRunning]) {
      await ctx.db.patch(state._id, {
        status: "queued",
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(0, internal.integrations.pullNangoRecords, {
        connectionId: state.connectionId,
        stream: state.stream,
      });
    }
  },
});
