import { v } from "convex/values";
import { mutation } from "../_generated/server";

const CONFIRMATION = "remove-unused-page-features";
const BATCH_SIZE = 100;

export const runBatch = mutation({
  args: {
    confirmation: v.string(),
    cursor: v.union(v.string(), v.null()),
    phase: v.union(
      v.literal("pages"),
      v.literal("audienceMembers"),
      v.literal("audiences"),
    ),
  },
  handler: async (ctx, { confirmation, cursor, phase }) => {
    if (confirmation !== CONFIRMATION) {
      throw new Error("Invalid migration confirmation");
    }

    if (phase === "pages") {
      const page = await ctx.db.query("pages").paginate({
        cursor,
        numItems: BATCH_SIZE,
      });
      let changed = 0;

      for (const document of page.page) {
        if (
          document.showInNavigation !== undefined ||
          document.accessPolicy !== undefined
        ) {
          await ctx.db.patch(document._id, {
            accessPolicy: undefined,
            showInNavigation: undefined,
          });
          changed += 1;
        }
      }

      return {
        changed,
        cursor: page.isDone ? null : page.continueCursor,
        done: page.isDone,
        phase,
        processed: page.page.length,
      };
    }

    const table =
      phase === "audienceMembers" ? "siteAudienceMembers" : "siteAudiences";
    const documents = await ctx.db.query(table).take(BATCH_SIZE);

    for (const document of documents) {
      await ctx.db.delete(document._id);
    }

    return {
      changed: documents.length,
      cursor: null,
      done: documents.length < BATCH_SIZE,
      phase,
      processed: documents.length,
    };
  },
});
