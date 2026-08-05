import { planTreeMove, SLUG_PATTERN } from "@baseblocks/domain";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import {
  isOrganizationMember,
  requireOrganizationPermission,
} from "./permissions";
import { indexPageContent, queuePageContentIndex } from "./search";
import { touchSiteDraft } from "./model/draft";
import { softDeletePageSubtree } from "./model/pageDeletion";
import { synchronizeParentDocument } from "./model/pageHierarchy";

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

    return pages.filter((page) => page.deletedAt === undefined);
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

    if (parentId) {
      const parent = await ctx.db.get(parentId);
      if (
        !parent ||
        parent.deletedAt !== undefined ||
        parent.siteId !== siteId
      ) {
        throw new Error("Parent page not found in site");
      }
    }

    const existing = await ctx.db
      .query("pages")
      .withIndex("by_slug", (q) =>
        q.eq("siteId", siteId).eq("slug", normalizedSlug),
      )
      .first();

    if (existing && existing.deletedAt === undefined) {
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
    await touchSiteDraft(ctx, siteId, now, [
      { entityType: "page", entityId: pageId },
    ]);
    if (parentId) {
      await synchronizeParentDocument(ctx, parentId, now);
    }

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
    if (!page || page.deletedAt !== undefined)
      throw new Error("Page not found");

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

      if (existing && existing.deletedAt === undefined) {
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
    await touchSiteDraft(ctx, page.siteId, Date.now(), [
      { entityType: "page", entityId: pageId },
    ]);
    if (
      page.parentId &&
      (title !== undefined || icon !== undefined || clearIcon)
    ) {
      await synchronizeParentDocument(ctx, page.parentId);
    }

    if (title !== undefined) {
      const document = await ctx.db
        .query("pageDocuments")
        .withIndex("by_page", (q) => q.eq("pageId", pageId))
        .unique();
      if (document?.revisionId) {
        await queuePageContentIndex(
          ctx,
          pageId,
          document.revisionId,
          document.contentHash,
        );
      } else {
        await indexPageContent(ctx, pageId);
      }
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

    const pages = (
      await ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", siteId))
        .collect()
    ).filter((candidate) => candidate.deletedAt === undefined);
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
    const previousParentId = page.parentId;

    for (const update of plan.updates) {
      await ctx.db.patch(update.id as Id<"pages">, {
        parentId: update.parentId
          ? (update.parentId as Id<"pages">)
          : undefined,
        order: update.order,
        updatedAt: now,
      });
    }
    await touchSiteDraft(
      ctx,
      siteId,
      now,
      plan.updates.map((update) => ({
        entityType: "page" as const,
        entityId: update.id as Id<"pages">,
      })),
    );
    if (previousParentId) {
      await synchronizeParentDocument(ctx, previousParentId, now);
    }
    if (plan.parentId && plan.parentId !== previousParentId) {
      await synchronizeParentDocument(ctx, plan.parentId as Id<"pages">, now);
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

    const now = Date.now();
    const { deletedPageIds, defaultChanged } = await softDeletePageSubtree(
      ctx,
      pageId,
      now,
    );
    await touchSiteDraft(ctx, page.siteId, now, [
      ...(defaultChanged
        ? [{ entityType: "site" as const, entityId: site._id }]
        : []),
      ...deletedPageIds.map((id) => ({
        entityType: "page" as const,
        entityId: id,
      })),
    ]);
    if (page.parentId) {
      await synchronizeParentDocument(ctx, page.parentId, now);
    }

    return { success: true };
  },
});
