import { v } from "convex/values";
import { query } from "../_generated/server";
import { checkIsMember } from "../auth";
import { getActiveLayoutRevisionsForPage } from "../deployments/snapshots";
import { canViewerAccessPublishedPageById } from "../sharing/pageAccess";

// Get all layouts for a page (draft version - for editor, authenticated)
export const list = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) return [];

    const site = await ctx.db.get(page.siteId);
    if (!site) return [];

    if (!(await checkIsMember(ctx, site.teamId))) return [];

    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .collect();

    // Sort by order
    layouts.sort((a, b) => a.order - b.order);

    return layouts;
  },
});

// Get all layouts for a page (published version - for public site)
export const listPublished = query({
  args: {
    pageId: v.id("pages"),
    sessionTokens: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { pageId, sessionTokens }) => {
    const canAccessPage = await canViewerAccessPublishedPageById(
      ctx,
      pageId,
      sessionTokens,
    );
    if (!canAccessPage) {
      return [];
    }

    const layouts = await getActiveLayoutRevisionsForPage(ctx, pageId);
    layouts.sort((a, b) => a.order - b.order);
    return layouts;
  },
});

// Get single layout (authenticated)
export const get = query({
  args: { layoutId: v.id("layouts") },
  handler: async (ctx, { layoutId }) => {
    const layout = await ctx.db.get(layoutId);
    if (!layout) return null;

    const page = await ctx.db.get(layout.pageId);
    if (!page) return null;

    const site = await ctx.db.get(page.siteId);
    if (!site) return null;

    if (!(await checkIsMember(ctx, site.teamId))) return null;
    return layout;
  },
});

// Get library IDs that are actively used in blocks on published pages
// This is used to filter search results to only include documents from active libraries
export const getActiveLibraryIds = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const activeDeployment = await ctx.db
      .query("deployments")
      .withIndex("by_site_status", (q) =>
        q.eq("siteId", siteId).eq("status", "active"),
      )
      .first();
    if (!activeDeployment) return [];

    const libraryIds = new Set<string>();
    const layouts = await ctx.db
      .query("layoutRevisions")
      .withIndex("by_deployment", (q) =>
        q.eq("deploymentId", activeDeployment._id),
      )
      .collect();

    for (const layout of layouts) {
      for (const slot of layout.slots) {
        for (const block of slot.blocks) {
          if (block.type === "library" && block.content?.libraryId) {
            libraryIds.add(block.content.libraryId);
          }
        }
      }
    }

    return Array.from(libraryIds);
  },
});
