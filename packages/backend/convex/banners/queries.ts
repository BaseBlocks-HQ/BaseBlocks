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
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const banners: BannerBlock[] = [];

    for (const page of pages) {
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

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
                sourcePageId: page._id,
                sourcePageTitle: page.title,
              });
            }
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
    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    const banners: BannerBlock[] = [];

    for (const page of pages) {
      const layouts = await ctx.db
        .query("layouts")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .collect();

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
                sourcePageId: page._id,
                sourcePageTitle: page.title,
              });
            }
          }
        }
      }
    }

    return banners;
  },
});
