import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel, Doc, Id } from "./_generated/dataModel.js";
import { extractBlockNoteText } from "./lib/extractBlockNoteText.js";
import { isExtractable } from "./lib/extractable.js";

export const migrations = new Migrations<DataModel>(components.migrations);

// Define the subpage content type
interface SubpageContent {
  title?: string;
  description?: string;
  content?: unknown[];
}

// Migration 1: Index all existing subpages from layouts
export const indexSubpages = migrations.define({
  table: "layouts",
  batchSize: 20, // Layouts can be large with nested content
  migrateOne: async (ctx, layout) => {
    // Get the page to find the siteId
    const page = await ctx.db.get(layout.pageId);
    if (!page) return;

    // Process all slots and blocks
    for (const slot of layout.slots) {
      for (const block of slot.blocks) {
        if (block.type === "subpage" && block.content) {
          const content = block.content as SubpageContent;
          const sourceId = `${layout._id}:${slot.id}:${block.id}`;

          // Check if already indexed
          const existing = await ctx.db
            .query("searchableContent")
            .withIndex("by_source", (q) =>
              q.eq("contentType", "subpage").eq("sourceId", sourceId),
            )
            .first();

          if (!existing) {
            const extractedText = extractBlockNoteText(content.content);
            const combinedText =
              `${content.title || ""} ${content.description || ""} ${extractedText}`.trim();

            // Only index if there's meaningful content
            if (combinedText.length > 0) {
              await ctx.db.insert("searchableContent", {
                siteId: page.siteId,
                contentType: "subpage",
                sourceId,
                title: content.title || "Untitled",
                extractedText: combinedText,
                metadata: {
                  pageId: page._id,
                  layoutId: layout._id,
                  blockId: block.id,
                  slotId: slot.id,
                  description: content.description,
                },
                updatedAt: Date.now(),
              });
            }
          }
        }
      }
    }
  },
});

// Migration 2: Index existing documents with extracted text
export const indexDocuments = migrations.define({
  table: "documents",
  batchSize: 50,
  migrateOne: async (ctx, doc) => {
    // Only index documents that have extracted text
    if (!doc.extractedText) return;

    // Check if already indexed
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "document").eq("sourceId", doc._id),
      )
      .first();

    if (!existing) {
      await ctx.db.insert("searchableContent", {
        siteId: doc.siteId,
        contentType: "document",
        sourceId: doc._id,
        title: doc.filename,
        extractedText: doc.extractedText,
        metadata: {
          filename: doc.filename,
          fileContentType: doc.contentType,
          size: doc.size,
          cdnUrl: doc.cdnUrl,
          libraryId: doc.libraryId,
        },
        updatedAt: Date.now(),
      });
    }
  },
});

// Migration 3: Fix documents stuck as "pending" that are non-extractable (images, csv, etc.)
// Sets them to "unsupported" so they don't appear as awaiting extraction
export const fixPendingNonExtractable = migrations.define({
  table: "documents",
  batchSize: 50,
  migrateOne: async (ctx, doc) => {
    if (doc.extractionStatus === "pending" && !isExtractable(doc.contentType)) {
      await ctx.db.patch(doc._id, {
        extractionStatus: "unsupported",
        extractionError: `Content type ${doc.contentType} does not support text extraction`,
      });
    }
  },
});

// Migration 4: Index ALL documents in searchableContent (not just extracted ones)
// Ensures every document is findable by filename, even if extraction failed/unsupported
export const indexAllDocuments = migrations.define({
  table: "documents",
  batchSize: 50,
  migrateOne: async (ctx, doc) => {
    // Check if already indexed
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "document").eq("sourceId", doc._id),
      )
      .first();

    if (existing) return; // Already indexed, skip

    // Use extracted text if available, otherwise fall back to filename
    const extractedText = doc.extractedText || doc.filename;

    await ctx.db.insert("searchableContent", {
      siteId: doc.siteId,
      contentType: "document",
      sourceId: doc._id,
      title: doc.filename,
      extractedText,
      metadata: {
        filename: doc.filename,
        fileContentType: doc.contentType,
        size: doc.size,
        cdnUrl: doc.cdnUrl,
        libraryId: doc.libraryId,
      },
      updatedAt: Date.now(),
    });
  },
});

// Migration 5: Bootstrap published fields on sites
// Copies current draft state to published fields for all published sites
export const bootstrapSitePublishedFields = migrations.define({
  table: "sites",
  batchSize: 10,
  migrateOne: async (ctx, site) => {
    // Only bootstrap if not already done and site is published
    if (site.publishedName) return; // Already bootstrapped
    if (!site.isPublished) return; // Not published, skip

    await ctx.db.patch(site._id, {
      publishedName: site.name,
      publishedLogoUrl: site.logoUrl,
      publishedDefaultPageId: site.defaultPageId,
      publishedSettings: site.settings,
      contentModifiedAt: site.updatedAt,
      lastDeployedAt: site.updatedAt,
      deploymentVersion: 0, // Pre-migration state
    });
  },
});

// Migration 6: Bootstrap published fields on pages
export const bootstrapPagePublishedFields = migrations.define({
  table: "pages",
  batchSize: 50,
  migrateOne: async (ctx, page) => {
    // Only bootstrap if not already done
    if (page.isDeployed !== undefined) return;

    // Check if the page's site is published
    const site = await ctx.db.get(page.siteId);
    if (!site || !site.isPublished) return;

    await ctx.db.patch(page._id, {
      publishedTitle: page.title,
      publishedSlug: page.slug,
      publishedIcon: page.icon,
      publishedOrder: page.order,
      publishedParentId: page.parentId,
      publishedPageTabs: page.pageTabs,
      isDeployed: true,
    });
  },
});

// Migration 7: Bootstrap published fields on layouts
export const bootstrapLayoutPublishedFields = migrations.define({
  table: "layouts",
  batchSize: 20,
  migrateOne: async (ctx, layout) => {
    // Only bootstrap if not already done
    if (layout.isDeployed !== undefined) return;

    // Check if the layout's site is published
    const page = await ctx.db.get(layout.pageId);
    if (!page) return;

    const site = await ctx.db.get(page.siteId);
    if (!site || !site.isPublished) return;

    // If publishedSlots already exists (from old deploy), also set the other fields
    await ctx.db.patch(layout._id, {
      publishedType: layout.type,
      publishedOrder: layout.order,
      publishedSettings: layout.settings,
      publishedTabId: layout.tabId,
      publishedSlots: layout.publishedSlots ?? layout.slots,
      isDeployed: true,
    });
  },
});

// Runner for all migrations - run in order
export const runAll = migrations.runner([
  internal.migrations.indexSubpages,
  internal.migrations.indexDocuments,
]);

// Runner for the new fix migrations (run these for existing data)
export const runSearchFixes = migrations.runner([
  internal.migrations.fixPendingNonExtractable,
  internal.migrations.indexAllDocuments,
]);

// Runner for deployment bootstrap migrations
export const runDeploymentBootstrap = migrations.runner([
  internal.migrations.bootstrapSitePublishedFields,
  internal.migrations.bootstrapPagePublishedFields,
  internal.migrations.bootstrapLayoutPublishedFields,
]);

// Individual runners for testing
export const runSubpages = migrations.runner([
  internal.migrations.indexSubpages,
]);
export const runDocuments = migrations.runner([
  internal.migrations.indexDocuments,
]);
export const runFixPending = migrations.runner([
  internal.migrations.fixPendingNonExtractable,
]);
export const runIndexAll = migrations.runner([
  internal.migrations.indexAllDocuments,
]);
export const runBootstrapSites = migrations.runner([
  internal.migrations.bootstrapSitePublishedFields,
]);
export const runBootstrapPages = migrations.runner([
  internal.migrations.bootstrapPagePublishedFields,
]);
export const runBootstrapLayouts = migrations.runner([
  internal.migrations.bootstrapLayoutPublishedFields,
]);

// ============================================================
// Migration 8: Convert subpage blocks to reference real child pages
// ============================================================

// Old subpage block content shape (pre-migration)
interface OldSubpageContent {
  title?: string;
  description?: string;
  content?: unknown[];
  mermaidCode?: string;
  diagrams?: Array<{ id: string; label: string; mermaidCode: string }>;
  diagramTheme?: string;
  diagramTabsMode?: string;
}

function titleToSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "subpage"
  );
}

export const migrateSubpagesToPages = migrations.define({
  table: "layouts",
  batchSize: 10,
  migrateOne: async (ctx, layout) => {
    const page = await ctx.db.get(layout.pageId);
    if (!page) return;

    const site = await ctx.db.get(page.siteId);
    if (!site) return;

    const processSlots = async (slots: typeof layout.slots) => {
      let changed = false;
      const updatedSlots = [];

      for (const slot of slots) {
        const updatedBlocks = [];
        for (const block of slot.blocks) {
          if (
            block.type === "subpage" &&
            block.content &&
            (block.content as { pageId?: unknown }).pageId === undefined
          ) {
            const content = block.content as OldSubpageContent;
            const title = content.title || "Untitled";
            const baseSlug = titleToSlug(title);

            // Ensure unique slug
            let slug = baseSlug;
            let counter = 1;
            while (true) {
              const existing = await ctx.db
                .query("pages")
                .withIndex("by_slug", (q) =>
                  q.eq("siteId", page.siteId).eq("slug", slug),
                )
                .first();
              if (!existing) break;
              slug = `${baseSlug}-${counter}`;
              counter++;
            }

            // Get sibling count for ordering
            const siblings = await ctx.db
              .query("pages")
              .withIndex("by_parent", (q) =>
                q.eq("siteId", page.siteId).eq("parentId", layout.pageId),
              )
              .collect();
            const maxOrder = siblings.reduce(
              (max, p) => Math.max(max, p.order),
              -1,
            );

            const now = Date.now();
            const childPageId = await ctx.db.insert("pages", {
              siteId: page.siteId,
              title,
              slug,
              parentId: layout.pageId,
              order: maxOrder + 1,
              isPublished: false,
              isSubpageContent: true,
              createdBy: page.createdBy,
              createdAt: now,
              updatedAt: now,
            });

            // Build blocks for the child page's layout
            const childBlocks: Array<{
              id: string;
              type: "paragraph" | "flowchart";
              content: unknown;
            }> = [];

            const extractedText = extractBlockNoteText(content.content);
            if (extractedText) {
              childBlocks.push({
                id: `migrated-para-${block.id}`,
                type: "paragraph",
                content: { text: extractedText },
              });
            }

            if (
              (content.diagrams && content.diagrams.length > 0) ||
              content.mermaidCode
            ) {
              childBlocks.push({
                id: `migrated-flow-${block.id}`,
                type: "flowchart",
                content: {
                  mermaidCode:
                    content.mermaidCode ||
                    content.diagrams?.[0]?.mermaidCode ||
                    "",
                  diagrams: content.diagrams,
                  theme: content.diagramTheme,
                  tabsMode: content.diagramTabsMode || "row",
                },
              });
            }

            await ctx.db.insert("layouts", {
              pageId: childPageId,
              type: "single",
              slots: [
                {
                  id: `migrated-slot-${block.id}`,
                  position: 0,
                  blocks: childBlocks,
                },
              ],
              settings: {},
              order: 0,
              createdAt: now,
              updatedAt: now,
            });

            updatedBlocks.push({
              ...block,
              content: { pageId: childPageId },
            });
            changed = true;
          } else {
            updatedBlocks.push(block);
          }
        }
        updatedSlots.push({ ...slot, blocks: updatedBlocks });
      }

      return { updatedSlots, changed };
    };

    const draftResult = await processSlots(layout.slots);
    const updates: Record<string, unknown> = {};

    if (draftResult.changed) {
      updates.slots = draftResult.updatedSlots;
    }

    if (layout.publishedSlots) {
      const pubResult = await processSlots(layout.publishedSlots);
      if (pubResult.changed) {
        updates.publishedSlots = pubResult.updatedSlots;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await ctx.db.patch(layout._id, updates);
    }
  },
});

// Migration 9: Clean up subpage search entries (no longer needed)
export const cleanupSubpageSearchEntries = migrations.define({
  table: "searchableContent",
  batchSize: 50,
  migrateOne: async (ctx, entry) => {
    if (entry.contentType === "subpage") {
      await ctx.db.delete(entry._id);
    }
  },
});

export const runMigrateSubpages = migrations.runner([
  internal.migrations.migrateSubpagesToPages,
]);
export const runCleanupSubpageSearch = migrations.runner([
  internal.migrations.cleanupSubpageSearchEntries,
]);

// Migration 10: Flag pages referenced by subpage blocks as isSubpageContent
export const flagSubpageContentPages = migrations.define({
  table: "layouts",
  batchSize: 20,
  migrateOne: async (ctx, layout) => {
    const slotsToCheck = [...layout.slots, ...(layout.publishedSlots ?? [])];
    for (const slot of slotsToCheck) {
      for (const block of slot.blocks) {
        if (block.type === "subpage" && block.content?.pageId) {
          const pageId = block.content.pageId as Id<"pages">;
          const page = await ctx.db.get(pageId);
          if (page && !page.isSubpageContent) {
            await ctx.db.patch(pageId, { isSubpageContent: true });
          }
        }
      }
    }
  },
});
export const runFlagSubpageContent = migrations.runner([
  internal.migrations.flagSubpageContentPages,
]);

// Migration 11: Remove deprecated hasUndeployedChanges field from all sites
export const removeHasUndeployedChanges = migrations.define({
  table: "sites",
  batchSize: 50,
  migrateOne: async (ctx, site) => {
    if (
      (site as { hasUndeployedChanges?: unknown }).hasUndeployedChanges !==
      undefined
    ) {
      await ctx.db.patch(site._id, {
        hasUndeployedChanges: undefined,
      } as unknown as Partial<Doc<"sites">>);
    }
  },
});
export const runRemoveHasUndeployedChanges = migrations.runner([
  internal.migrations.removeHasUndeployedChanges,
]);

// ============================================================
// Migration 12: Normalize decision-tree block content
// ============================================================
// Old format: { nodes: DecisionTreeNode[] }
// New format: { nodes: DecisionTreeNode[], trees: DecisionTree[] }
// After migration every decision-tree block has a `trees` array so
// the frontend normalizeTrees() fallback can be removed.

function generateMigrationTreeId() {
  return Math.random().toString(36).slice(2, 9);
}

export const normalizeDecisionTreeContent = migrations.define({
  table: "layouts",
  batchSize: 20,
  migrateOne: async (ctx, layout) => {
    const processSlots = (
      slots: typeof layout.slots,
    ): { updatedSlots: typeof layout.slots; changed: boolean } => {
      let changed = false;
      const updatedSlots = slots.map((slot) => ({
        ...slot,
        blocks: slot.blocks.map((block) => {
          if (block.type !== "decision-tree" || !block.content) return block;
          const content = block.content as {
            nodes?: unknown[];
            trees?: unknown[];
            tabsMode?: string;
          };
          // Already normalized
          if (content.trees && (content.trees as unknown[]).length > 0)
            return block;
          // Needs normalization — wrap nodes into a single tree
          changed = true;
          return {
            ...block,
            content: {
              ...content,
              trees: [
                {
                  id: generateMigrationTreeId(),
                  label: "Tree 1",
                  nodes: content.nodes ?? [],
                },
              ],
            },
          };
        }),
      }));
      return { updatedSlots, changed };
    };

    const draftResult = processSlots(layout.slots);
    const updates: Record<string, unknown> = {};

    if (draftResult.changed) {
      updates.slots = draftResult.updatedSlots;
    }

    if (layout.publishedSlots) {
      const pubResult = processSlots(layout.publishedSlots);
      if (pubResult.changed) {
        updates.publishedSlots = pubResult.updatedSlots;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await ctx.db.patch(layout._id, updates);
    }
  },
});
export const runNormalizeDecisionTrees = migrations.runner([
  internal.migrations.normalizeDecisionTreeContent,
]);

// ============================================================
// Migration 13: Stringify deployment snapshot page-layouts data
// ============================================================
// Early deployments stored page-layouts data as native objects.
// Newer deploys always JSON.stringify() to avoid the 16-level nesting
// limit. This migration converts the remaining object-format snapshots
// so the rollback fallback (typeof === "string" ? JSON.parse : data)
// can be removed.

export const stringifySnapshotData = migrations.define({
  table: "deploymentSnapshots",
  batchSize: 50,
  migrateOne: async (ctx, snapshot) => {
    if (
      snapshot.chunkType === "page-layouts" &&
      typeof snapshot.data !== "string"
    ) {
      await ctx.db.patch(snapshot._id, {
        data: JSON.stringify(snapshot.data),
      });
    }
  },
});
export const runStringifySnapshots = migrations.runner([
  internal.migrations.stringifySnapshotData,
]);

// Combined runner for data cleanup migrations 12+13
export const runDataCleanup = migrations.runner([
  internal.migrations.normalizeDecisionTreeContent,
  internal.migrations.stringifySnapshotData,
]);

// ============================================================
// Migration 14: Backfill siteId on layouts
// ============================================================
// New denormalized field for efficient site-wide layout queries.
// Resolves siteId by looking up the layout's page.

export const backfillLayoutSiteId = migrations.define({
  table: "layouts",
  batchSize: 50,
  migrateOne: async (ctx, layout) => {
    if (layout.siteId) return; // Already set

    const page = await ctx.db.get(layout.pageId);
    if (!page) return;

    await ctx.db.patch(layout._id, { siteId: page.siteId });
  },
});
export const runBackfillLayoutSiteId = migrations.runner([
  internal.migrations.backfillLayoutSiteId,
]);

// ============================================================
// Migration 15: Index existing subpage content pages for search
// ============================================================
// After the subpage refactor (subpages are now real pages with
// isSubpageContent=true), search indexing was not wired up.
// This migration indexes all existing subpage pages into
// searchableContent using pageId as sourceId.

export const indexSubpagePages = migrations.define({
  table: "pages",
  batchSize: 20,
  migrateOne: async (ctx, page) => {
    if (!page.isSubpageContent) return;

    // Skip if already indexed with the new format
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "subpage").eq("sourceId", page._id),
      )
      .first();
    if (existing) return;

    // Get all layouts for this subpage
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect();

    // Extract text from all blocks
    const parts: string[] = [];
    for (const layout of layouts) {
      for (const slot of layout.slots) {
        for (const block of slot.blocks) {
          const c = block.content as Record<string, unknown> | undefined;
          if (!c) continue;
          if (block.type === "richtext" && Array.isArray(c.document)) {
            parts.push(extractBlockNoteText(c.document));
          } else {
            if (typeof c.text === "string") parts.push(c.text);
            if (typeof c.title === "string") parts.push(c.title);
            if (typeof c.description === "string") parts.push(c.description);
          }
        }
      }
    }

    const extractedText = parts
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const combinedText = `${page.title} ${extractedText}`.trim();
    if (!combinedText) return;

    await ctx.db.insert("searchableContent", {
      siteId: page.siteId,
      contentType: "subpage",
      sourceId: page._id,
      title: page.title,
      extractedText: combinedText,
      metadata: {
        pageId: page._id,
      },
      updatedAt: Date.now(),
    });
  },
});
export const runIndexSubpagePages = migrations.runner([
  internal.migrations.indexSubpagePages,
]);

// ============================================================
// Migration 16: Deploy subpage content layouts
// ============================================================
// The subpage refactor migration created new pages + layouts for
// subpage content but never set isDeployed/publishedSlots on them.
// The old inline content lived in the parent layout's publishedSlots
// so it was always visible. This migration marks subpage content
// pages and their layouts as deployed so listPublished returns them.

export const deploySubpageLayouts = migrations.define({
  table: "pages",
  batchSize: 20,
  migrateOne: async (ctx, page) => {
    if (!page.isSubpageContent) return;

    // Mark the page as deployed if it isn't already
    if (!page.isDeployed) {
      await ctx.db.patch(page._id, {
        isDeployed: true,
        publishedTitle: page.title,
        publishedSlug: page.slug,
        publishedIcon: page.icon,
        publishedOrder: page.order,
        publishedParentId: page.parentId,
        publishedPageTabs: page.pageTabs,
      });
    }

    // Deploy all layouts for this subpage
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect();

    for (const layout of layouts) {
      if (!layout.isDeployed || !layout.publishedSlots) {
        await ctx.db.patch(layout._id, {
          isDeployed: true,
          publishedSlots: layout.slots,
          publishedType: layout.type,
          publishedOrder: layout.order,
          publishedSettings: layout.settings,
          publishedTabId: layout.tabId,
        });
      }
    }
  },
});
export const runDeploySubpageLayouts = migrations.runner([
  internal.migrations.deploySubpageLayouts,
]);

// ============================================================
// Migration 17: Re-index subpage search content (fix richtext extraction)
// ============================================================
// Migration 15 used c.content instead of c.document for richtext blocks.
// This migration deletes all subpage search entries and re-indexes them.

export const reindexSubpageSearch = migrations.define({
  table: "pages",
  batchSize: 20,
  migrateOne: async (ctx, page) => {
    if (!page.isSubpageContent) return;

    // Delete existing entry
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "subpage").eq("sourceId", page._id),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Re-extract text from layouts
    const layouts = await ctx.db
      .query("layouts")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect();

    const parts: string[] = [];
    for (const layout of layouts) {
      for (const slot of layout.slots) {
        for (const block of slot.blocks) {
          const c = block.content as Record<string, unknown> | undefined;
          if (!c) continue;
          if (block.type === "richtext" && Array.isArray(c.document)) {
            parts.push(extractBlockNoteText(c.document));
          } else {
            if (typeof c.text === "string") parts.push(c.text);
            if (typeof c.title === "string") parts.push(c.title);
            if (typeof c.description === "string") parts.push(c.description);
          }
        }
      }
    }

    const extractedText = parts
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const combinedText = `${page.title} ${extractedText}`.trim();
    if (!combinedText) return;

    await ctx.db.insert("searchableContent", {
      siteId: page.siteId,
      contentType: "subpage",
      sourceId: page._id,
      title: page.title,
      extractedText: combinedText,
      metadata: {
        pageId: page._id,
      },
      updatedAt: Date.now(),
    });
  },
});
export const runReindexSubpageSearch = migrations.runner([
  internal.migrations.reindexSubpageSearch,
]);

// Migration 18: Strip HTML entities (&nbsp; etc.) from plain-text block content
// ContentEditable returns &nbsp; for trailing spaces; the tag-strip regex missed them.
export const stripHtmlEntities = migrations.define({
  table: "layouts",
  batchSize: 50,
  migrateOne: async (ctx, layout) => {
    const decode = (s: string) =>
      s
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

    const cleanNodes = (
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
      nodes: any[] | undefined,
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
    ): { result: any[]; changed: boolean } => {
      if (!Array.isArray(nodes)) return { result: nodes ?? [], changed: false };
      let changed = false;
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
      const result = nodes.map((node: any) => {
        const cbs = node.contentBlocks;
        if (!Array.isArray(cbs)) return node;
        // biome-ignore lint/suspicious/noExplicitAny: migration raw data
        const newCbs = cbs.map((cb: any) => {
          const cc = cb.content;
          if (
            cc &&
            typeof cc.text === "string" &&
            cc.text !== decode(cc.text)
          ) {
            changed = true;
            return { ...cb, content: { ...cc, text: decode(cc.text) } };
          }
          return cb;
        });
        if (newCbs !== cbs) return { ...node, contentBlocks: newCbs };
        return node;
      });
      return { result, changed };
    };

    // biome-ignore lint/suspicious/noExplicitAny: migration raw data
    const cleanSlots = (slots: any[]) => {
      let dirty = false;
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
      const cleaned = slots.map((slot: any) => {
        // biome-ignore lint/suspicious/noExplicitAny: migration raw data
        const blocks = (slot.blocks as any[]).map((block: any) => {
          const c = block.content;
          if (!c) return block;

          // Direct text fields (heading, paragraph, callout, etc.)
          if (typeof c.text === "string" && c.text !== decode(c.text)) {
            dirty = true;
            return { ...block, content: { ...c, text: decode(c.text) } };
          }

          // Decision tree: nodes and trees contain nested contentBlocks
          if (block.type === "decision-tree") {
            const newContent = { ...c };
            const nodesResult = cleanNodes(c.nodes);
            if (nodesResult.changed) dirty = true;
            newContent.nodes = nodesResult.result;
            if (Array.isArray(c.trees)) {
              // biome-ignore lint/suspicious/noExplicitAny: migration raw data
              newContent.trees = (c.trees as any[]).map((tree: any) => {
                const treeResult = cleanNodes(tree.nodes);
                if (treeResult.changed) dirty = true;
                return { ...tree, nodes: treeResult.result };
              });
            }
            return { ...block, content: newContent };
          }

          return block;
        });
        return { ...slot, blocks };
      });
      return { cleaned, dirty };
    };

    // biome-ignore lint/suspicious/noExplicitAny: migration raw data
    const patch: any = {};

    const slotsResult = cleanSlots(layout.slots);
    if (slotsResult.dirty) patch.slots = slotsResult.cleaned;

    if (layout.publishedSlots) {
      const pubResult = cleanSlots(layout.publishedSlots);
      if (pubResult.dirty) patch.publishedSlots = pubResult.cleaned;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(layout._id, patch);
    }
  },
});
export const runStripHtmlEntities = migrations.runner([
  internal.migrations.stripHtmlEntities,
]);
