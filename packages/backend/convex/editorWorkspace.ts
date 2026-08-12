import { v } from "convex/values";
import { query } from "./_generated/server";
import { isOrganizationMember } from "./permissions";
import type { Doc, Id } from "./_generated/dataModel";
import { buildDraftSummary } from "./model/draftSummary";
import { readPageContent } from "./model/pageDocuments";
import { hashOpenEditorContent } from "./pageContentFormat";

export function draftRestoreView(
  restoreId: Id<"draftRestores">,
  restore: Doc<"draftRestores"> | null,
) {
  return restore
    ? {
        _id: restore._id,
        status: restore.status,
        failure: restore.failure,
      }
    : {
        _id: restoreId,
        status: "orphaned" as const,
        failure:
          "The draft restore state is missing. The draft remains locked to avoid exposing partial data. Contact support to recover it.",
      };
}

/**
 * The editor shell and canvas are one reactive surface, so they subscribe to
 * one atomic workspace snapshot. This avoids sibling components independently
 * loading (and briefly disagreeing about) the same site and page collection.
 */
export const get = query({
  args: {
    organizationId: v.string(),
    siteId: v.id("sites"),
    requestedPageId: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, siteId, requestedPageId }) => {
    const site = await ctx.db.get(siteId);
    if (!site || site.organizationId !== organizationId) return null;
    if (!(await isOrganizationMember(ctx, site.organizationId))) return null;

    const draftSummary = await buildDraftSummary(ctx, site);

    if (site.activeDraftRestoreId) {
      const restore = await ctx.db.get(site.activeDraftRestoreId);
      return {
        status: "restoring" as const,
        site,
        pages: [],
        selectedPage: null,
        selectedDocument: null,
        draftSummary,
        restore: draftRestoreView(site.activeDraftRestoreId, restore),
      };
    }

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const visiblePages = pages.filter((page) => page.deletedAt === undefined);
    const normalizedRequestedPageId = requestedPageId
      ? ctx.db.normalizeId("pages", requestedPageId)
      : null;
    const selectedPage =
      visiblePages.find((page) => page._id === normalizedRequestedPageId) ??
      visiblePages[0] ??
      null;
    const selectedContent = selectedPage
      ? await readPageContent(ctx, selectedPage._id)
      : null;

    return {
      status: "ready" as const,
      site,
      pages: visiblePages,
      selectedPage,
      selectedDocument:
        selectedPage && selectedContent
          ? {
              pageId: selectedPage._id,
              document: selectedContent.document,
              contentHash:
                selectedContent.record?.contentHash ??
                hashOpenEditorContent(JSON.stringify(selectedContent.document)),
            }
          : null,
      draftSummary,
      restore: null,
    };
  },
});
