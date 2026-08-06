import {
  generateSlug,
  SLUG_PATTERN,
  uniqueSlugAmong,
} from "@baseblocks/domain";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { touchSiteDraft } from "./model/draft";

const canonicalPageSlugPattern = new RegExp(`^${SLUG_PATTERN}$`);

/**
 * Canonicalize page slugs imported before page writes enforced the domain
 * invariant. This migration is idempotent and preserves uniqueness per site.
 */
export const normalizePageSlugs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db.query("pages").collect();
    const usedSlugsBySite = new Map<string, Set<string>>();

    for (const page of pages) {
      if (
        page.deletedAt !== undefined ||
        !canonicalPageSlugPattern.test(page.slug)
      ) {
        continue;
      }
      const used = usedSlugsBySite.get(page.siteId) ?? new Set<string>();
      used.add(page.slug);
      usedSlugsBySite.set(page.siteId, used);
    }

    const repairs: Array<{
      pageId: string;
      previousSlug: string;
      nextSlug: string;
    }> = [];
    const changedPageIdsBySite = new Map<Id<"sites">, Array<Id<"pages">>>();
    const invalidPages = pages
      .filter((page) => !canonicalPageSlugPattern.test(page.slug))
      .sort((a, b) => a._id.localeCompare(b._id));

    for (const page of invalidPages) {
      const used = usedSlugsBySite.get(page.siteId) ?? new Set<string>();
      const baseSlug =
        generateSlug(page.slug) || generateSlug(page.title) || "page";
      const nextSlug = uniqueSlugAmong(baseSlug, used);
      used.add(nextSlug);
      usedSlugsBySite.set(page.siteId, used);

      await ctx.db.patch(page._id, { slug: nextSlug, updatedAt: Date.now() });
      repairs.push({
        pageId: page._id,
        previousSlug: page.slug,
        nextSlug,
      });
      if (page.deletedAt === undefined) {
        const changedPageIds = changedPageIdsBySite.get(page.siteId) ?? [];
        changedPageIds.push(page._id);
        changedPageIdsBySite.set(page.siteId, changedPageIds);
      }
    }

    for (const [siteId, pageIds] of changedPageIdsBySite) {
      await touchSiteDraft(
        ctx,
        siteId,
        Date.now(),
        pageIds.map((pageId) => ({ entityType: "page", entityId: pageId })),
      );
    }

    return repairs;
  },
});

/**
 * Reindex every active sibling group to contiguous integer positions while
 * preserving its existing visual order. Imported data previously used
 * fractional positions, which the canonical page model no longer permits.
 */
export const normalizePageOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db.query("pages").collect();
    const siblingGroups = new Map<string, typeof pages>();

    for (const page of pages) {
      if (page.deletedAt !== undefined) continue;
      const groupKey = `${page.siteId}:${page.parentId ?? "root"}`;
      const siblings = siblingGroups.get(groupKey) ?? [];
      siblings.push(page);
      siblingGroups.set(groupKey, siblings);
    }

    const repairs: Array<{
      pageId: string;
      previousOrder: number;
      nextOrder: number;
    }> = [];
    const changedPageIdsBySite = new Map<Id<"sites">, Array<Id<"pages">>>();

    for (const siblings of siblingGroups.values()) {
      siblings.sort((a, b) => a.order - b.order || a._id.localeCompare(b._id));
      for (const [nextOrder, page] of siblings.entries()) {
        if (page.order === nextOrder) continue;
        await ctx.db.patch(page._id, {
          order: nextOrder,
          updatedAt: Date.now(),
        });
        repairs.push({
          pageId: page._id,
          previousOrder: page.order,
          nextOrder,
        });
        const changedPageIds = changedPageIdsBySite.get(page.siteId) ?? [];
        changedPageIds.push(page._id);
        changedPageIdsBySite.set(page.siteId, changedPageIds);
      }
    }

    for (const [siteId, pageIds] of changedPageIdsBySite) {
      await touchSiteDraft(
        ctx,
        siteId,
        Date.now(),
        pageIds.map((pageId) => ({ entityType: "page", entityId: pageId })),
      );
    }

    return repairs;
  },
});
