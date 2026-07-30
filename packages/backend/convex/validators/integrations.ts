import { v } from "convex/values";

export const integrationProvider = v.union(
  v.literal("notion"),
  v.literal("confluence"),
  v.literal("googleDrive"),
  v.literal("sharePoint"),
  v.literal("github"),
  v.literal("linear"),
  v.literal("jira"),
);

export const integrationConnectionStatus = v.union(
  v.literal("awaitingAuthorization"),
  v.literal("active"),
  v.literal("error"),
  v.literal("disconnecting"),
  v.literal("disconnected"),
);

export const integrationSyncStatus = v.union(
  v.literal("idle"),
  v.literal("queued"),
  v.literal("running"),
  v.literal("error"),
);
