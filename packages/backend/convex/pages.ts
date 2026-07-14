import { planTreeMove, SLUG_PATTERN } from "@baseblocks/domain";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { indexPageContent, removePageContentIndex } from "./search";

export type PageTreeNode = {
  _id: string;
  siteId: Doc<"pages">["siteId"];
  title: string;
  slug: string;
  icon?: string;
  order: number;
  parentId?: string;
  children: PageTreeNode[];
};

type ProjectedPage = {
  _id: string;
  siteId: Doc<"pages">["siteId"];
  title: string;
  slug: string;
  icon?: string;
  order: number;
  parentId?: string;
};

const pageSlugPattern = new RegExp(`^${SLUG_PATTERN}$`);

function normalizePageSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!pageSlugPattern.test(normalized)) {
    throw new Error(
      "Page URLs may only contain lowercase letters, numbers, and hyphens",
    );
  }
  return normalized;
}

export function buildPageTree(pages: ProjectedPage[]): PageTreeNode[] {
  const pageMap = new Map<string, PageTreeNode>();
  const rootPages: PageTreeNode[] = [];

  for (const page of pages) {
    pageMap.set(page._id, { ...page, children: [] });
  }

  for (const node of pageMap.values()) {
    if (node.parentId) {
      const parent = pageMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        rootPages.push(node);
      }
    } else {
      rootPages.push(node);
    }
  }

  sortChildren(rootPages);

  return rootPages;
}

function sortChildren(pages: PageTreeNode[]) {
  pages.sort((a, b) => a.order - b.order);
  for (const page of pages) {
    sortChildren(page.children);
  }
}

export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];

    if (!(await isOrganizationMember(ctx, site.organizationId))) return [];

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();

    return pages;
  },
});

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    title: v.string(),
    slug: v.string(),
    parentId: v.optional(v.id("pages")),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { siteId, title, slug, parentId, icon }) => {
    const normalizedSlug = normalizePageSlug(slug);
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );

    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", siteId).eq("slug", normalizedSlug),
      )
      .first();

    if (existing) {
      throw new Error(
        `A page with the URL "${normalizedSlug}" already exists. Please choose a different title or URL slug.`,
      );
    }

    const lastSibling = await ctx.db
      .query("pages")
      .withIndex("by_parent_order", (q) =>
        q.eq("siteId", siteId).eq("parentId", parentId),
      )
      .order("desc")
      .first();

    const now = Date.now();
    const pageId = await ctx.db.insert("pages", {
      siteId,
      title,
      slug: normalizedSlug,
      parentId,
      icon,
      order: (lastSibling?.order ?? -1) + 1,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    return pageId;
  },
});

export const update = mutation({
  args: {
    pageId: v.id("pages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.string()),
    clearIcon: v.optional(v.boolean()),
  },
  handler: async (ctx, { pageId, title, slug, icon, clearIcon }) => {
    const normalizedSlug =
      slug === undefined ? undefined : normalizePageSlug(slug);
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    if (normalizedSlug && normalizedSlug !== page.slug) {
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_slug", (q) =>
          q.eq("siteId", page.siteId).eq("slug", normalizedSlug),
        )
        .first();

      if (existing) {
        throw new Error(
          `A page with the URL "${normalizedSlug}" already exists. Please choose a different title or URL slug.`,
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (title !== undefined) updates.title = title;
    if (normalizedSlug !== undefined) updates.slug = normalizedSlug;
    if (clearIcon) updates.icon = undefined;
    else if (icon !== undefined) updates.icon = icon;

    await ctx.db.patch(pageId, updates);

    if (title !== undefined) {
      await indexPageContent(ctx, pageId);
    }

    return pageId;
  },
});

export const moveInTree = mutation({
  args: {
    siteId: v.id("sites"),
    pageId: v.id("pages"),
    targetId: v.optional(v.id("pages")),
    placement: v.union(
      v.literal("before"),
      v.literal("after"),
      v.literal("inside"),
      v.literal("root-end"),
    ),
  },
  handler: async (ctx, { siteId, pageId, targetId, placement }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    const pages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect();
    const page = pages.find((candidate) => candidate._id === pageId);
    if (!page) throw new Error("Page not found in site");
    if (targetId && !pages.some((candidate) => candidate._id === targetId)) {
      throw new Error("Target page not found in site");
    }

    const plan = planTreeMove(
      pages.map((candidate) => ({
        id: candidate._id,
        parentId: candidate.parentId ?? null,
        order: candidate.order,
      })),
      {
        nodeId: pageId,
        targetId: targetId ?? null,
        placement,
      },
    );
    const now = Date.now();

    for (const update of plan.updates) {
      await ctx.db.patch(update.id as Id<"pages">, {
        parentId: update.parentId
          ? (update.parentId as Id<"pages">)
          : undefined,
        order: update.order,
        updatedAt: now,
      });
    }

    return {
      pageId,
      parentId: plan.parentId ? (plan.parentId as Id<"pages">) : undefined,
      order: plan.index,
    };
  },
});

export const remove = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, { pageId }) => {
    const page = await ctx.db.get(pageId);
    if (!page) throw new Error("Page not found");

    const site = await ctx.db.get(page.siteId);
    if (!site) throw new Error("Site not found");

    await requireOrganizationPermission(ctx, site.organizationId, {
      resource: "content",
      action: "edit",
    });

    const isDefaultPage = site.defaultPageId === pageId;

    const allPages = await ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();

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

    for (const id of pagesToDelete) {
      await removePageContentIndex(ctx, id as Id<"pages">);
    }

    const contents = await ctx.db
      .query("pageContents")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();
    const contentByPageId = new Map(
      contents.map((content) => [content.pageId, content]),
    );
    const references = await ctx.db
      .query("pageReferences")
      .withIndex("by_site", (q) => q.eq("siteId", page.siteId))
      .collect();
    const referencesByPageId = new Map(
      references.map((reference) => [reference.pageId, reference]),
    );
    for (const id of pagesToDelete) {
      const content = contentByPageId.get(id as Id<"pages">);
      if (content) await ctx.db.delete(content._id);
      const reference = referencesByPageId.get(id as Id<"pages">);
      if (reference) await ctx.db.delete(reference._id);
      await ctx.db.delete(id as Id<"pages">);
    }

    return { success: true };
  },
});
