import { v } from "convex/values";
import { query } from "../_generated/server";

interface BannerBlock {
  id: string;
  content: {
    alerts: Array<{
      id: string;
      title: string;
      description: string;
      importance: string;
    }>;
    importancePresets: Array<{
      id: string;
      name: string;
      color: string;
      foreground: string;
    }>;
    settings: {
      dismissible: boolean;
      autoCycle: boolean;
      cycleIntervalMs: number;
      scope: "this-page" | "site-wide" | "specific-pages";
      targetPageIds: string[];
    };
  };
  sourcePageId: string;
  sourcePageTitle: string;
}

// Get all site-wide banner blocks across all published pages
export const getSiteWideBanners = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    // Single query via by_site index (eliminates N+1)
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    // Build pageId → page lookup for source metadata
    const pageIds = new Set(layouts.map((l) => l.pageId));
    const pageMap = new Map<string, { title: string }>();
    for (const pid of pageIds) {
      const page = await ctx.db.get(pid);
      if (page) pageMap.set(pid, { title: page.title });
    }

    const banners: BannerBlock[] = [];

    for (const layout of layouts) {
      const slots = layout.publishedSlots ?? [];
      for (const slot of slots) {
        for (const block of slot.blocks) {
          if (
            block.type === "banner" &&
            block.content?.settings?.scope === "site-wide" &&
            block.content?.alerts?.length > 0
          ) {
            banners.push({
              id: block.id,
              content: block.content,
              sourcePageId: layout.pageId,
              sourcePageTitle: pageMap.get(layout.pageId)?.title ?? "",
            });
          }
        }
      }
    }

    return banners;
  },
});

// Get banners scoped to specific pages that include a given pageId
export const getBannersForPage = query({
  args: { siteId: v.id("sites"), pageId: v.id("pages") },
  handler: async (ctx, { siteId, pageId }) => {
    // Single query via by_site index (eliminates N+1)
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    // Build pageId → page lookup for source metadata
    const pageIds = new Set(layouts.map((l) => l.pageId));
    const pageMap = new Map<string, { title: string }>();
    for (const pid of pageIds) {
      const page = await ctx.db.get(pid);
      if (page) pageMap.set(pid, { title: page.title });
    }

    const banners: BannerBlock[] = [];

    for (const layout of layouts) {
      const slots = layout.publishedSlots ?? [];
      for (const slot of slots) {
        for (const block of slot.blocks) {
          if (
            block.type === "banner" &&
            block.content?.settings?.scope === "specific-pages" &&
            block.content?.settings?.targetPageIds?.includes(pageId) &&
            block.content?.alerts?.length > 0
          ) {
            banners.push({
              id: block.id,
              content: block.content,
              sourcePageId: layout.pageId,
              sourcePageTitle: pageMap.get(layout.pageId)?.title ?? "",
            });
          }
        }
      }
    }

    return banners;
  },
});
