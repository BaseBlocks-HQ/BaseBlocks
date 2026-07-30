import type { IntegrationProviderKey } from "@baseblocks/domain";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalAction, query } from "./_generated/server";
import {
  type NangoContentMetadataRecord,
  getNangoIntegrationId,
  nangoRequest,
  normalizeNangoContentResource,
  toPublicIntegrationError,
} from "./integrationNango";
import {
  areIntegrationsEnabled,
  requireIntegrationsEnabled,
} from "./integrationAccess";
import {
  requireOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { integrationProvider } from "./validators/integrations";

interface ConnectSessionResponse {
  data: {
    token: string;
    expires_at: string;
    connect_link: string;
  };
}

interface NangoRecordsResponse {
  records: NangoContentMetadataRecord[];
  next_cursor?: string;
}

function throwProviderUnavailable(provider: IntegrationProviderKey): never {
  throw new ConvexError({
    code: "PROVIDER_UNAVAILABLE",
    message: `${provider} is not available yet`,
  });
}

export const listConnections = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireOrganizationMember(ctx, args.organizationId);
    if (!areIntegrationsEnabled()) return [];

    const connections = await ctx.db
      .query("integrationConnections")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();

    return await Promise.all(
      connections
        .filter((connection) => connection.status !== "disconnected")
        .sort((left, right) => right.createdAt - left.createdAt)
        .map(async (connection) => {
          const syncState = await ctx.db
            .query("integrationSyncStates")
            .withIndex("by_connection_stream", (q) =>
              q
                .eq("connectionId", connection._id)
                .eq("stream", "contentMetadata"),
            )
            .unique();
          return {
            _id: connection._id,
            provider: connection.provider,
            status: connection.status,
            createdAt: connection.createdAt,
            connectedAt: connection.connectedAt,
            lastSyncAt: connection.lastSyncAt,
            resourceCount: connection.resourceCount,
            errorMessage: connection.errorMessage,
            canReconnect: Boolean(connection.adapterConnectionId),
            syncStatus: syncState?.status ?? null,
            syncErrorMessage: syncState?.errorMessage,
          };
        }),
    );
  },
});

export const beginAuthorization = action({
  args: {
    organizationId: v.string(),
    provider: integrationProvider,
  },
  handler: async (ctx, args): Promise<{ connectUrl: string }> => {
    requireIntegrationsEnabled();
    if (args.provider !== "notion") {
      return throwProviderUnavailable(args.provider);
    }
    const { auth } = await requireOrganizationPermission(
      ctx,
      args.organizationId,
      { resource: "integration", action: "manage" },
    );
    const connectionId = await ctx.runMutation(
      internal.integrationModel.getOrCreateAuthorizationIntent,
      {
        organizationId: args.organizationId,
        provider: args.provider,
        userId: auth.userId,
      },
    );

    try {
      const integrationId = getNangoIntegrationId(args.provider);
      const response = await nangoRequest<ConnectSessionResponse>(
        "/connect/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            allowed_integrations: [integrationId],
            tags: {
              end_user_id: auth.userId,
              ...(auth.email ? { end_user_email: auth.email } : {}),
              end_user_display_name: auth.name ?? auth.email ?? auth.userId,
              organization_id: args.organizationId,
              baseblocks_connection_id: connectionId,
            },
          }),
        },
      );
      return { connectUrl: response.data.connect_link };
    } catch (error) {
      const publicMessage = toPublicIntegrationError(error);
      await ctx.runMutation(
        internal.integrationModel.markAuthorizationStartFailed,
        {
          connectionId,
          message: publicMessage,
        },
      );
      throw new ConvexError({
        code: "INTEGRATION_SERVICE_ERROR",
        message: publicMessage,
      });
    }
  },
});

export const reconnect = action({
  args: { connectionId: v.id("integrationConnections") },
  handler: async (ctx, args): Promise<{ connectUrl: string }> => {
    requireIntegrationsEnabled();
    const connection = await ctx.runQuery(
      internal.integrationModel.getConnectionForOperation,
      args,
    );
    if (!connection?.adapterConnectionId) {
      throw new ConvexError({
        code: "CONNECTION_NOT_FOUND",
        message: "Integration connection not found",
      });
    }
    await requireOrganizationPermission(ctx, connection.organizationId, {
      resource: "integration",
      action: "manage",
    });
    const integrationId = getNangoIntegrationId(connection.provider);
    try {
      const response = await nangoRequest<ConnectSessionResponse>(
        "/connect/sessions/reconnect",
        {
          method: "POST",
          body: JSON.stringify({
            connection_id: connection.adapterConnectionId,
            integration_id: integrationId,
          }),
        },
      );
      return { connectUrl: response.data.connect_link };
    } catch (error) {
      throw new ConvexError({
        code: "INTEGRATION_SERVICE_ERROR",
        message: toPublicIntegrationError(error),
      });
    }
  },
});

export const disconnect = action({
  args: { connectionId: v.id("integrationConnections") },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.integrationModel.getConnectionForOperation,
      args,
    );
    if (!connection) return null;
    await requireOrganizationPermission(ctx, connection.organizationId, {
      resource: "integration",
      action: "manage",
    });
    if (!connection.adapterConnectionId) {
      await ctx.runMutation(internal.integrationModel.finishDisconnect, args);
      return null;
    }

    await ctx.runMutation(internal.integrationModel.markDisconnecting, args);
    try {
      const integrationId = getNangoIntegrationId(connection.provider);
      const search = new URLSearchParams({
        provider_config_key: integrationId,
      });
      await nangoRequest(
        `/connections/${encodeURIComponent(connection.adapterConnectionId)}?${search}`,
        { method: "DELETE" },
      );
      await ctx.runMutation(internal.integrationModel.finishDisconnect, args);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "";
      if (rawMessage.includes("(404)")) {
        await ctx.runMutation(internal.integrationModel.finishDisconnect, args);
        return null;
      }
      await ctx.runMutation(internal.integrationModel.finishDisconnect, {
        ...args,
        errorMessage: toPublicIntegrationError(error),
      });
      throw new ConvexError({
        code: "INTEGRATION_SERVICE_ERROR",
        message: toPublicIntegrationError(error),
      });
    }
    return null;
  },
});

export const retrySync = action({
  args: { connectionId: v.id("integrationConnections") },
  handler: async (ctx, args) => {
    requireIntegrationsEnabled();
    const connection = await ctx.runQuery(
      internal.integrationModel.getConnectionForOperation,
      args,
    );
    if (connection?.status !== "active" || !connection.adapterConnectionId) {
      throw new ConvexError({
        code: "CONNECTION_NOT_ACTIVE",
        message: "Integration connection is not active",
      });
    }
    await requireOrganizationPermission(ctx, connection.organizationId, {
      resource: "integration",
      action: "manage",
    });

    try {
      await nangoRequest<{ success: boolean }>("/sync/trigger", {
        method: "POST",
        body: JSON.stringify({
          provider_config_key: getNangoIntegrationId(connection.provider),
          syncs: ["content-metadata"],
          connection_id: connection.adapterConnectionId,
        }),
      });
      return null;
    } catch (error) {
      throw new ConvexError({
        code: "INTEGRATION_SERVICE_ERROR",
        message: toPublicIntegrationError(error),
      });
    }
  },
});

export const pullNangoRecords = internalAction({
  args: {
    connectionId: v.id("integrationConnections"),
    stream: v.string(),
  },
  handler: async (ctx, args) => {
    if (!areIntegrationsEnabled()) return;

    const claimed = await ctx.runMutation(
      internal.integrationModel.claimSync,
      args,
    );
    if (!claimed) return;

    try {
      const integrationId = getNangoIntegrationId(claimed.provider);
      let cursor = claimed.cursor;
      let pageCount = 0;
      let hasMore = false;

      while (pageCount < 100) {
        const search = new URLSearchParams({
          model: claimed.model,
          limit: "100",
        });
        if (cursor) search.set("cursor", cursor);

        const response = await nangoRequest<NangoRecordsResponse>(
          `/records?${search}`,
          {
            headers: {
              "Connection-Id": claimed.adapterConnectionId,
              "Provider-Config-Key": integrationId,
            },
          },
        );
        const lastRecordCursor =
          response.records.at(-1)?._nango_metadata?.cursor;
        const nextCursor = response.next_cursor ?? lastRecordCursor;
        await ctx.runMutation(internal.integrationModel.applyResourceBatch, {
          ...args,
          resources: response.records.map(normalizeNangoContentResource),
          cursor: nextCursor,
        });

        pageCount += 1;
        hasMore = Boolean(response.next_cursor && response.records.length > 0);
        if (!hasMore) break;
        cursor = response.next_cursor;
      }

      if (pageCount >= 100 && hasMore) {
        await ctx.runMutation(internal.integrationModel.continueSync, args);
        return;
      }
      await ctx.runMutation(internal.integrationModel.completeSync, args);
    } catch (error) {
      await ctx.runMutation(internal.integrationModel.failSync, {
        ...args,
        errorMessage:
          error instanceof Error ? error.message.slice(0, 500) : "Sync failed",
      });
    }
  },
});
