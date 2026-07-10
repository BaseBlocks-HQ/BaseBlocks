import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const BATCH_SIZE = 25;

async function buildLegacyContent(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  page: Doc<"pages">,
) {
  const [sections, columns, blocks] = await Promise.all([
    ctx.db
      .query("sections")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
    ctx.db
      .query("columns")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
    ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
  ]);

  const legacyPage = page as Doc<"pages"> & {
    pageTabs?: Array<{ id: string; label: string }>;
  };
  return {
    tabs: legacyPage.pageTabs ?? [],
    sections: sections
      .sort((a, b) => a.order - b.order)
      .map((section, sectionOrder) => ({
        id: section._id as string,
        tabId: section.tabId,
        region: section.region,
        order: sectionOrder,
        columns: columns
          .filter((column) => column.sectionId === section._id)
          .sort((a, b) => a.order - b.order)
          .map((column, columnOrder) => ({
            id: column._id as string,
            order: columnOrder,
            blocks: blocks
              .filter((block) => block.columnId === column._id)
              .sort((a, b) => a.order - b.order)
              .map((block, blockOrder) => ({
                id: block._id as string,
                type: block.type,
                content: block.content,
                order: blockOrder,
              })),
          })),
      })),
  };
}

export const migratePageContents = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    processed: v.number(),
    created: v.number(),
    skipped: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("pages")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    let created = 0;
    let skipped = 0;

    for (const page of result.page) {
      const content = await buildLegacyContent(ctx, page);
      const existing = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .unique();
      const updatedAt = Date.now();
      if (existing) {
        skipped += 1;
      } else {
        await ctx.db.insert("pageContents", {
          siteId: page.siteId,
          pageId: page._id,
          ...content,
          updatedAt,
        });
        created += 1;
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.migratePageContents, {
        cursor: result.continueCursor,
      });
    }

    return {
      processed: result.page.length,
      created,
      skipped,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const verifyPageContents = internalQuery({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    checked: v.number(),
    missing: v.array(v.id("pages")),
    mismatched: v.array(v.id("pages")),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("pages")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    const missing: Array<Id<"pages">> = [];
    const mismatched: Array<Id<"pages">> = [];

    for (const page of result.page) {
      const expected = await buildLegacyContent(ctx, page);
      const actual = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .unique();
      if (!actual) {
        missing.push(page._id);
      } else if (
        JSON.stringify({ tabs: actual.tabs, sections: actual.sections }) !==
        JSON.stringify(expected)
      ) {
        mismatched.push(page._id);
      }
    }

    return {
      checked: result.page.length,
      missing,
      mismatched,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});
