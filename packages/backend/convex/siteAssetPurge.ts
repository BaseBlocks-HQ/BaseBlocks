"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { getStorage } from "./storage";

const MAX_PURGES_PER_RUN = 50;

export const purge = internalAction({
  args: { fileId: v.optional(v.id("files")) },
  handler: async (ctx, { fileId }) => {
    let purged = 0;
    for (let index = 0; index < MAX_PURGES_PER_RUN; index += 1) {
      const claimed = await ctx.runMutation(internal.siteAssetLifecycle.claim, {
        fileId: index === 0 ? fileId : undefined,
      });
      if (!claimed) break;
      try {
        await getStorage().delete(claimed.objectKey);
        await ctx.runMutation(internal.siteAssetLifecycle.completePurge, {
          fileId: claimed.fileId,
        });
        purged += 1;
      } catch (error) {
        await ctx.runMutation(internal.siteAssetLifecycle.failPurge, {
          fileId: claimed.fileId,
          failure:
            error instanceof Error ? error.message : "Storage deletion failed",
        });
        if (fileId) break;
      }
      if (fileId) break;
    }
    return { purged };
  },
});
