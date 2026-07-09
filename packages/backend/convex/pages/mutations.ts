import { createLayoutDraft } from "@baseblocks/domain";
import type { GenericMutationCtx } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { DataModel } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireContentEditor } from "../auth";
import {
  indexPageContent,
  removePageContentIndex,
} from "../search/indexPageContent";
import { markSiteModified } from "../sites/markModified";
import { pageAccessPolicyValidator } from "../sharing/pageAccess";

function createEditorId(): string {
  return Math.random().toString(36).slice(2, 12);
}

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
      showInNavigation,
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
    targetLayoutId: v.optional(v.id("layouts")),
    targetSlotId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { pageId, exposure, targetPageId, targetLayoutId, targetSlotId },
  ) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const now = Date.now();
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();

    const removeReferences = async () => {
      for (const layout of layouts) {
        let changed = false;
        const nextSlots = layout.slots.map((slot) => {
          const nextBlocks = slot.blocks.filter((block) => {
            if (block.type !== "page") return true;
            const linkedPageId = block.content?.pageId;
            const shouldKeep = linkedPageId !== pageId;
            if (!shouldKeep) {
              changed = true;
            }
            return shouldKeep;
          });

          if (nextBlocks.length === slot.blocks.length) {
            return slot;
          }

          return {
            ...slot,
            blocks: nextBlocks,
          };
        });

        if (!changed) continue;

        await ctx.db.patch(layout._id, {
          slots: nextSlots,
          updatedAt: now,
        });
        await ctx.db.patch(layout.pageId, { updatedAt: now });
      }
    };

    const ensureReferenceOnTargetPage = async () => {
      if (!targetPageId || targetPageId === pageId) return;

      const targetPage = await ctx.db.get(targetPageId);
      if (!targetPage || targetPage.siteId !== page.siteId) return;

      const targetLayouts = layouts
        .filter((layout) => layout.pageId === targetPageId)
        .sort((a, b) => a.order - b.order);

      const existingReference = targetLayouts.some((layout) =>
        layout.slots.some((slot) =>
          slot.blocks.some(
            (block) =>
              block.type === "page" && block.content?.pageId === pageId,
          ),
        ),
      );

      if (existingReference) return;

      const requestedLayout = targetLayoutId
        ? targetLayouts.find((layout) => layout._id === targetLayoutId)
        : undefined;

      const targetLayout =
        requestedLayout && requestedLayout.slots.length > 0
          ? requestedLayout
          : targetLayouts.find((layout) => layout.slots.length > 0);

      if (!targetLayout) {
        const layoutDraft = createLayoutDraft({
          createId: createEditorId,
          type: "single",
        });
        const firstSlot = layoutDraft.slots[0];
        if (!firstSlot) return;
        await ctx.db.insert("layouts", {
          siteId: page.siteId,
          pageId: targetPageId,
          type: layoutDraft.type,
          slots: [
            {
              ...firstSlot,
              blocks: [
                {
                  id: `page-${pageId}-${now}`,
                  type: "page",
                  content: { pageId },
                },
              ],
            },
          ],
          settings: layoutDraft.settings,
          order: 0,
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.patch(targetPageId, { updatedAt: now });
        return;
      }

      const targetSlot =
        (targetSlotId
          ? targetLayout.slots.find((slot) => slot.id === targetSlotId)
          : undefined) ?? targetLayout.slots[0];
      if (!targetSlot) return;

      const nextSlots = targetLayout.slots.map((slot) =>
        slot.id === targetSlot.id
          ? {
              ...slot,
              blocks: [
                ...slot.blocks,
                {
                  id: `page-${pageId}-${now}`,
                  type: "page" as const,
                  content: { pageId },
                },
              ],
            }
          : slot,
      );

      await ctx.db.patch(targetLayout._id, {
        slots: nextSlots,
        updatedAt: now,
      });
      await ctx.db.patch(targetPageId, { updatedAt: now });
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

// Update page
export const update = mutation({
  args: {
    pageId: v.id("pages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.string()),
    showInNavigation: v.optional(v.boolean()),
  },
  handler: async (ctx, { pageId, title, slug, icon, showInNavigation }) => {
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
  // Delete all layouts for this page
  const layouts = await ctx.db
    .query("layouts")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .collect();

  for (const layout of layouts) {
    await ctx.db.delete(layout._id);
  }

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

// Update page tabs configuration
export const updatePageTabs = mutation({
  args: {
    pageId: v.id("pages"),
    pageTabs: v.optional(
      v.array(
        v.object({
          id: v.string(),
          label: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, { pageId, pageTabs }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    await ctx.db.patch(pageId, {
      pageTabs,
      updatedAt: Date.now(),
    });

    await markSiteModified(ctx, page.siteId);

    return pageId;
  },
});

// Enable page tabs - creates tabs and assigns all existing layouts to Tab 1
export const enablePageTabs = mutation({
  args: {
    pageId: v.id("pages"),
    tabs: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
      }),
    ),
  },
  handler: async (ctx, { pageId, tabs }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    // Skip if tabs already enabled
    if (page.pageTabs && page.pageTabs.length > 0) {
      return pageId;
    }

    const existingLayouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    const now = Date.now();
    const firstTabId = tabs[0]?.id;

    // Assign all existing layouts to the first tab
    if (firstTabId) {
      for (const layout of existingLayouts) {
        await ctx.db.patch(layout._id, { tabId: firstTabId, updatedAt: now });
      }
    }

    await ctx.db.patch(pageId, {
      pageTabs: tabs,
      updatedAt: now,
    });

    await markSiteModified(ctx, page.siteId);

    return pageId;
  },
});

// Disable page tabs - removes pageTabs and clears tabId from all layouts
export const disablePageTabs = mutation({
  args: {
    pageId: v.id("pages"),
  },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireContentEditor(ctx, site.teamId);

    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    const now = Date.now();
    for (const layout of layouts) {
      await ctx.db.patch(layout._id, { tabId: undefined, updatedAt: now });
    }

    await ctx.db.patch(pageId, {
      pageTabs: undefined,
      updatedAt: now,
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
