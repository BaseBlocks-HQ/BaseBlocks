import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { DataModel } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireContentEditor } from "../auth";
import {
  indexPageContent,
  removePageContentIndex,
} from "../lib/indexPageContent";
import { markSiteModified } from "../lib/markModified";
import { pageAccessPolicyValidator } from "../lib/pageAccess";

const pageBlock = v.any();

async function validateAudienceIdsForSite(
  ctx: Pick<GenericMutationCtx<DataModel>, "db">,
  siteId: Id<"sites">,
  audienceIds: Id<"siteAudiences">[],
): Promise<void> {
  const uniqueAudienceIds = Array.from(new Set(audienceIds));
  for (const audienceId of uniqueAudienceIds) {
    const audience = await ctx.db.get(audienceId);
    if (!audience || audience.siteId !== siteId) {
      throw new Error("Invalid audience selection");
    }
  }
}

// Create a new page
export const create = mutation({
  args: {
    siteId: v.id("sites"),
    title: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("pages")),
    icon: v.optional(v.string()),
    showInNavigation: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { siteId, title, slug, parentId, icon, showInNavigation },
  ) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireContentEditor(ctx, site.teamId);

    // Check slug uniqueness
    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) => q.eq("siteId", siteId).eq("slug", slug))
      .first();

    if (existing) {
      throw new Error(
        `A page with the URL "${slug}" already exists. Please choose a different title or URL slug.`,
      );
    }

    // Get max order for siblings
    const siblings = await ctx.db
      .query("pages")
      .withIndex("by_parent", (q) =>
        q.eq("siteId", siteId).eq("parentId", parentId),
      )
      .collect();

    const maxOrder = siblings.reduce((max, p) => Math.max(max, p.order), -1);

    const now = Date.now();
    const pageId = await ctx.db.insert("pages", {
      siteId,
      title,
      slug: slug.toLowerCase(),
      parentId,
      icon,
      order: maxOrder + 1,
      isPublished: false,
      showInNavigation,
      content: { blocks: [] },
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    await markSiteModified(ctx, siteId);

    return pageId;
  },
});

export const setExposure = mutation({
  args: {
    pageId: v.id("pages"),
    exposure: v.union(
      v.literal("navigation"),
      v.literal("block"),
      v.literal("both"),
    ),
    targetPageId: v.optional(v.id("pages")),
    targetBlockId: v.optional(v.string()),
  },
  handler: async (ctx, { pageId, exposure, targetPageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const now = Date.now();
    const removeReferences = async () => {
      const pages = await ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
        .collect();

      for (const candidate of pages) {
        const currentBlocks = candidate.content?.blocks ?? [];
        const nextBlocks = currentBlocks.filter(
          (block: { type?: string; content?: { pageId?: string } }) =>
            block.type !== "page" || block.content?.pageId !== pageId,
        );

        if (nextBlocks.length === currentBlocks.length) continue;

        await ctx.db.patch(candidate._id, {
          content: { blocks: nextBlocks },
          updatedAt: now,
        });
      }
    };

    const ensureReferenceOnTargetPage = async () => {
      if (!targetPageId || targetPageId === pageId) return;

      const targetPage = await ctx.db.get(targetPageId);
      if (!targetPage || targetPage.siteId !== page.siteId) return;

      const blocks = targetPage.content?.blocks ?? [];
      const existingReference = blocks.some(
        (block: { type?: string; content?: { pageId?: string } }) =>
          block.type === "page" && block.content?.pageId === pageId,
      );

      if (existingReference) return;

      await ctx.db.patch(targetPageId, {
        content: {
          blocks: [
            ...blocks,
            {
              id: `page-${pageId}-${now}`,
              type: "page",
              content: { pageId },
            },
          ],
        },
        updatedAt: now,
      });
    };

    if (exposure === "navigation") {
      await removeReferences();
      await ctx.db.patch(pageId, {
        showInNavigation: true,
        updatedAt: now,
      });
      await markSiteModified(ctx, page.siteId);
      return { exposure };
    }

    if (exposure === "block") {
      await ensureReferenceOnTargetPage();
      await ctx.db.patch(pageId, {
        showInNavigation: false,
        updatedAt: now,
      });
      await markSiteModified(ctx, page.siteId);
      return { exposure };
    }

    await ensureReferenceOnTargetPage();
    await ctx.db.patch(pageId, {
      showInNavigation: true,
      updatedAt: now,
    });
    await markSiteModified(ctx, page.siteId);
    return { exposure };
  },
});

export const appendBlock = mutation({
  args: {
    pageId: v.id("pages"),
    block: pageBlock,
  },
  handler: async (ctx, { pageId, block }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const now = Date.now();
    const blocks = page.content?.blocks ?? [];
    await ctx.db.patch(pageId, {
      content: { blocks: [...blocks, block] },
      updatedAt: now,
    });
    await markSiteModified(ctx, page.siteId);
    await indexPageContent(ctx, pageId);

    return block;
  },
});

export const updateBlock = mutation({
  args: {
    pageId: v.id("pages"),
    blockId: v.string(),
    block: pageBlock,
  },
  handler: async (ctx, { pageId, blockId, block }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const blocks = page.content?.blocks ?? [];
    const now = Date.now();
    await ctx.db.patch(pageId, {
      content: {
        blocks: blocks.map((current: { id?: string }) =>
          current.id === blockId ? block : current,
        ),
      },
      updatedAt: now,
    });
    await markSiteModified(ctx, page.siteId);
    await indexPageContent(ctx, pageId);

    return block;
  },
});

export const removeBlock = mutation({
  args: {
    pageId: v.id("pages"),
    blockId: v.string(),
  },
  handler: async (ctx, { pageId, blockId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const blocks = page.content?.blocks ?? [];
    const now = Date.now();
    await ctx.db.patch(pageId, {
      content: {
        blocks: blocks.filter((block: { id?: string }) => block.id !== blockId),
      },
      updatedAt: now,
    });
    await markSiteModified(ctx, page.siteId);
    await indexPageContent(ctx, pageId);

    return blockId;
  },
});

export const reorderBlocks = mutation({
  args: {
    pageId: v.id("pages"),
    blockIds: v.array(v.string()),
  },
  handler: async (ctx, { pageId, blockIds }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const blocks = page.content?.blocks ?? [];
    const byId = new Map(blocks.map((block: { id?: string }) => [block.id, block]));
    const ordered = blockIds
      .map((id) => byId.get(id))
      .filter((block): block is (typeof blocks)[number] => Boolean(block));
    const missing = blocks.filter(
      (block: { id?: string }) => !block.id || !blockIds.includes(block.id),
    );

    await ctx.db.patch(pageId, {
      content: { blocks: [...ordered, ...missing] },
      updatedAt: Date.now(),
    });
    await markSiteModified(ctx, page.siteId);

    return blockIds;
  },
});

// Update page
export const update = mutation({
  args: {
    pageId: v.id("pages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    showInNavigation: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { pageId, title, slug, icon, isPublished, showInNavigation },
  ) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    // Check slug uniqueness if changing
    if (slug && slug !== page.slug) {
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", page.siteId).eq("slug", slug),
        )
        .first();

      if (existing) {
        throw new Error(
          `A page with the URL "${slug}" already exists. Please choose a different title or URL slug.`,
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug.toLowerCase();
    if (icon !== undefined) updates.icon = icon;
    if (isPublished !== undefined) updates.isPublished = isPublished;
    if (showInNavigation !== undefined) {
      updates.showInNavigation = showInNavigation;
    }

    await ctx.db.patch(pageId, updates);
    await markSiteModified(ctx, page.siteId);

    // Re-index if title changed (title is part of the search index)
    if (title !== undefined) {
      await indexPageContent(ctx, pageId);
    }

    return pageId;
  },
});

export const updateAccessPolicy = mutation({
  args: {
    pageId: v.id("pages"),
    accessPolicy: pageAccessPolicyValidator,
  },
  handler: async (ctx, { pageId, accessPolicy }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    if (
      accessPolicy.kind === "audiences" &&
      accessPolicy.audienceIds.length === 0
    ) {
      throw new Error("Choose at least one audience");
    }

    if (accessPolicy.kind === "audiences") {
      await validateAudienceIdsForSite(ctx, site._id, accessPolicy.audienceIds);
    }

    await ctx.db.patch(pageId, {
      accessPolicy,
      updatedAt: Date.now(),
    });
    await markSiteModified(ctx, page.siteId);

    return pageId;
  },
});

// Reorder pages within a parent - takes ordered array of page IDs
export const reorder = mutation({
  args: {
    siteId: v.id("sites"),
    parentId: v.optional(v.id("pages")),
    pageIds: v.array(v.id("pages")),
  },
  handler: async (ctx, { siteId, pageIds }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const now = Date.now();
    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i];
      if (pageId) {
        await ctx.db.patch(pageId, { order: i, updatedAt: now });
      }
    }

    await markSiteModified(ctx, siteId);

    return pageIds;
  },
});

// Helper to recursively delete a page and its children
async function deletePageRecursively(
  ctx: Pick<GenericMutationCtx<DataModel>, "db">,
  pageId: Id<"pages">,
  siteId: Id<"sites">,
) {
  // Recursively delete child pages
  const children = await ctx.db
    .query("pages")
    .withIndex("by_parent", (q) =>
      q.eq("siteId", siteId).eq("parentId", pageId),
    )
    .collect();

  for (const child of children) {
    await deletePageRecursively(ctx, child._id, siteId);
  }

  await ctx.db.delete(pageId);
}

// Move page to new parent and/or position
export const move = mutation({
  args: {
    pageId: v.id("pages"),
    newParentId: v.optional(v.id("pages")),
    newOrder: v.number(),
  },
  handler: async (ctx, { pageId, newParentId, newOrder }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    // Verify new parent exists if specified
    if (newParentId) {
      const parent = await ctx.db.get(newParentId);
      if (!parent || parent.siteId !== page.siteId) {
        throw new Error("Target page not found");
      }

      // Prevent moving page into itself or its descendants
      let checkId: Id<"pages"> | undefined = newParentId;
      while (checkId) {
        if (checkId === pageId) {
          throw new Error("Cannot move page into itself or its descendants");
        }
        const checkPage: Doc<"pages"> | null = await ctx.db.get(checkId);
        checkId = checkPage?.parentId;
      }
    }

    await ctx.db.patch(pageId, {
      parentId: newParentId,
      order: newOrder,
      updatedAt: Date.now(),
    });

    await markSiteModified(ctx, page.siteId);

    return pageId;
  },
});

// Delete page
export const remove = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    // Check if this is the default page
    const isDefaultPage = site.defaultPageId === pageId;

    // Get all pages for descendant collection
    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();

    // Collect all descendant IDs
    const pagesToDelete = new Set<string>([pageId]);
    const collectDescendants = (parentId: string) => {
      const children = allPages.filter((p) => p.parentId === parentId);
      for (const child of children) {
        pagesToDelete.add(child._id);
        collectDescendants(child._id);
      }
    };
    collectDescendants(pageId);

    const remainingPages = allPages
      .filter((p) => !pagesToDelete.has(p._id))
      .sort((a, b) => a.order - b.order);

    // If deleting the default page, reassign to first remaining page
    if (isDefaultPage) {
      const firstRootPage = remainingPages.find((p) => !p.parentId);
      const newDefaultPage = firstRootPage ?? remainingPages[0];

      if (newDefaultPage) {
        await ctx.db.patch(site._id, {
          defaultPageId: newDefaultPage._id,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.patch(site._id, {
          defaultPageId: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    // Remove search index entries for all pages being deleted
    for (const id of pagesToDelete) {
      await removePageContentIndex(ctx, id as Id<"pages">);
    }

    await deletePageRecursively(ctx, pageId, page.siteId);
    await markSiteModified(ctx, page.siteId);

    return { success: true };
  },
});
