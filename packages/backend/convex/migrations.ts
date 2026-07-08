import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel, Doc, Id } from "./_generated/dataModel.js";
import { deleteDocumentRows } from "./documents/lib.js";
import { buildDocumentSearchMetadata } from "./lib/documentSearchMetadata.js";
import { extractBlockNoteText } from "./lib/extractBlockNoteText.js";

export const migrations = new Migrations<DataModel>(components.migrations);

type LegacyPageDoc = Doc<"pages"> & {
  isSubpageContent?: boolean;
  showInNavigation?: boolean;
};

type LegacySearchableContentDoc = Doc<"searchableContent"> & {
  contentType: Doc<"searchableContent">["contentType"] | "subpage";
};

// Legacy inline page block content before page blocks referenced real pages.
interface LegacyInlinePageContent {
  title?: string;
  description?: string;
  content?: unknown[];
}

// Migration 1: Index all existing legacy page blocks from layouts
export const indexLegacyPageBlocks = migrations.define({
  table: "layouts",
  batchSize: 20, // Layouts can be large with nested content
  migrateOne: async (ctx, layout) => {
    // Get the page to find the siteId
    const page = await ctx.db.get(layout.pageId);
    if (!page) return;

    // Process all slots and blocks
    for (const slot of layout.slots) {
      for (const block of slot.blocks) {
        if ((block.type as string) === "subpage" && block.content) {
          const content = block.content as LegacyInlinePageContent;
          const sourceId = `${layout._id}:${slot.id}:${block.id}`;

          // Check if already indexed
          const existing = await ctx.db
            .query("searchableContent")
            .withIndex("by_source", (q) =>
              q.eq("contentType", "page").eq("sourceId", sourceId),
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
                contentType: "page",
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

// Migration 2: Index documents in searchableContent by filename.
export const indexAllDocuments = migrations.define({
  table: "documents",
  batchSize: 5,
  migrateOne: async (ctx, doc) => {
    // Check if already indexed
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "document").eq("sourceId", doc._id),
      )
      .first();

    if (existing) return; // Already indexed, skip

    await ctx.db.insert("searchableContent", {
      siteId: doc.siteId,
      contentType: "document",
      sourceId: doc._id,
      title: doc.filename,
      extractedText: doc.filename,
      metadata: buildDocumentSearchMetadata({
        documentId: doc._id,
        assetId: doc.assetId,
        filename: doc.filename,
        contentType: doc.contentType,
        size: doc.size,
        libraryId: doc.libraryId,
      }),
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
  batchSize: 5,
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
  internal.migrations.indexLegacyPageBlocks,
  internal.migrations.indexAllDocuments,
]);

// Runner for document search fixes.
export const runSearchFixes = migrations.runner([
  internal.migrations.indexAllDocuments,
]);

// Runner for deployment bootstrap migrations
export const runDeploymentBootstrap = migrations.runner([
  internal.migrations.bootstrapSitePublishedFields,
  internal.migrations.bootstrapPagePublishedFields,
  internal.migrations.bootstrapLayoutPublishedFields,
]);

// Individual runners for testing
export const runLegacyPageBlocks = migrations.runner([
  internal.migrations.indexLegacyPageBlocks,
]);
export const runDocuments = migrations.runner([
  internal.migrations.indexAllDocuments,
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
// Migration 8: Convert legacy inline page blocks to reference real child pages
// ============================================================

// Old inline page block content shape (pre-migration)
interface OldInlinePageContent {
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
      .replace(/^-+|-+$/g, "") || "page"
  );
}

export const migrateLegacyInlinePageBlocks = migrations.define({
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
            (block.type as string) === "subpage" &&
            block.content &&
            (block.content as { pageId?: unknown }).pageId === undefined
          ) {
            const content = block.content as OldInlinePageContent;
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
              showInNavigation: false,
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
              siteId: page.siteId,
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
              type: "page",
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

// Migration 9: Clean up legacy page search entries (no longer needed)
export const cleanupLegacyPageSearchEntries = migrations.define({
  table: "searchableContent",
  batchSize: 5,
  migrateOne: async (ctx, entry) => {
    const legacyContentType = (entry as LegacySearchableContentDoc)
      .contentType as string;
    if (legacyContentType === "subpage") {
      await ctx.db.delete(entry._id);
    }
  },
});

export const runMigrateLegacyInlinePageBlocks = migrations.runner([
  internal.migrations.migrateLegacyInlinePageBlocks,
]);
export const runCleanupLegacyPageSearch = migrations.runner([
  internal.migrations.cleanupLegacyPageSearchEntries,
]);

// Migration 10: Hide pages referenced by legacy page blocks from navigation
export const backfillLegacyPageVisibility = migrations.define({
  table: "layouts",
  batchSize: 20,
  migrateOne: async (ctx, layout) => {
    const slotsToCheck = [...layout.slots, ...(layout.publishedSlots ?? [])];
    for (const slot of slotsToCheck) {
      for (const block of slot.blocks) {
        if ((block.type as string) === "subpage" && block.content?.pageId) {
          const pageId = block.content.pageId as Id<"pages">;
          const page = (await ctx.db.get(pageId)) as LegacyPageDoc | null;
          if (page && page.showInNavigation !== false) {
            await ctx.db.patch(pageId, { showInNavigation: false });
          }
        }
      }
    }
  },
});
export const runBackfillLegacyPageVisibility = migrations.runner([
  internal.migrations.backfillLegacyPageVisibility,
]);

// Migration 11: Remove deprecated hasUndeployedChanges field from all sites
export const removeHasUndeployedChanges = migrations.define({
  table: "sites",
  batchSize: 5,
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
  batchSize: 5,
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
  batchSize: 5,
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
// Migration 15: Index existing pages for search
// ============================================================
// Searchable page content now uses the page ID as the source ID for every page.
// This migration indexes all existing pages into
// searchableContent using pageId as sourceId.

export const indexPagesForSearch = migrations.define({
  table: "pages",
  batchSize: 20,
  migrateOne: async (ctx, page) => {
    // Skip if already indexed with the new format
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "page").eq("sourceId", page._id),
      )
      .first();
    if (existing) return;

    // Get all layouts for this page
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
      contentType: "page",
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
export const runIndexPagesForSearch = migrations.runner([
  internal.migrations.indexPagesForSearch,
]);

// ============================================================
// Migration 16: Deploy hidden page layouts
// ============================================================
// The legacy page-block migration created new pages + layouts for
// hidden page content but never set isDeployed/publishedSlots on them.
// The old inline content lived in the parent layout's publishedSlots
// so it was always visible. This migration marks hidden page
// pages and their layouts as deployed so listPublished returns them.

export const deployHiddenPageLayouts = migrations.define({
  table: "pages",
  batchSize: 20,
  migrateOne: async (ctx, page) => {
    if (page.showInNavigation !== false) return;

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

    // Deploy all layouts for this page
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
export const runDeployHiddenPageLayouts = migrations.runner([
  internal.migrations.deployHiddenPageLayouts,
]);

// ============================================================
// Migration 17: Re-index page search content (fix richtext extraction)
// ============================================================
// Migration 15 used c.content instead of c.document for richtext blocks.
// This migration deletes all page search entries and re-indexes them.

export const reindexPageSearch = migrations.define({
  table: "pages",
  batchSize: 20,
  migrateOne: async (ctx, page) => {
    // Delete existing entry
    const existing = await ctx.db
      .query("searchableContent")
      .withIndex("by_source", (q) =>
        q.eq("contentType", "page").eq("sourceId", page._id),
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
      contentType: "page",
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
export const runReindexPageSearch = migrations.runner([
  internal.migrations.reindexPageSearch,
]);

// ============================================================
// Migration 18: Final page model cutover
// ============================================================
// - Renames legacy `subpage` block types to `page`
// - Backfills showInNavigation and removes legacy isSubpageContent

export const renameLegacyPageBlocks = migrations.define({
  table: "layouts",
  batchSize: 20,
  migrateOne: async (ctx, layout) => {
    const normalizeSlots = (slots: typeof layout.slots) => {
      let changed = false;
      const normalizedSlots: typeof layout.slots = slots.map((slot) => ({
        ...slot,
        blocks: slot.blocks.map((block) => {
          if ((block.type as string) !== "subpage") {
            return block;
          }

          changed = true;
          return {
            ...block,
            type: "page" as const,
            content: block.content ?? {},
          } as (typeof slot.blocks)[number];
        }),
      }));

      return { changed, normalizedSlots };
    };

    const draft = normalizeSlots(layout.slots);
    const published = layout.publishedSlots
      ? normalizeSlots(layout.publishedSlots)
      : null;

    if (!draft.changed && !published?.changed) {
      return;
    }

    await ctx.db.patch(layout._id, {
      ...(draft.changed
        ? { slots: draft.normalizedSlots as typeof layout.slots }
        : {}),
      ...(published?.changed
        ? { publishedSlots: published.normalizedSlots as typeof layout.slots }
        : {}),
      updatedAt: Date.now(),
    });
  },
});

export const backfillPageVisibility = migrations.define({
  table: "pages",
  batchSize: 20,
  migrateOne: async (ctx, page) => {
    const legacyPage = page as LegacyPageDoc;
    const nextShowInNavigation =
      legacyPage.showInNavigation ?? !legacyPage.isSubpageContent;

    const needsReplace =
      legacyPage.showInNavigation === undefined ||
      legacyPage.isSubpageContent !== undefined;

    if (!needsReplace) {
      return;
    }

    const { isSubpageContent: _legacyFlag, ...rest } = legacyPage;
    await ctx.db.replace(page._id, {
      ...rest,
      showInNavigation: nextShowInNavigation,
    });
  },
});

export const runPageModelCutover = migrations.runner([
  internal.migrations.renameLegacyPageBlocks,
  internal.migrations.backfillPageVisibility,
  internal.migrations.cleanupLegacyPageSearchEntries,
  internal.migrations.indexPagesForSearch,
  internal.migrations.deployHiddenPageLayouts,
  internal.migrations.reindexPageSearch,
]);

// ============================================================
// Migration 19: Convert decision-tree contentBlocks → BlockNote document
// ============================================================
// Old format: node.contentBlocks = [{ type: "heading", content: { text, level }, order }]
// New format: node.document = [{ type: "heading", content: "text", props: { level } }]
// Converts heading, paragraph, callout, code blocks to BlockNote PartialBlock format.
// Dividers are dropped (no BlockNote equivalent).

function convertContentBlocksToDocument(
  // biome-ignore lint/suspicious/noExplicitAny: migration raw data
  blocks: any[] | undefined,
): unknown[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return [];
  const sorted = [...blocks].sort(
    // biome-ignore lint/suspicious/noExplicitAny: migration raw data
    (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
  );
  const doc: unknown[] = [];
  for (const block of sorted) {
    switch (block.type) {
      case "heading":
        doc.push({
          type: "heading",
          content: block.content?.text || "",
          props: { level: Math.min(block.content?.level || 2, 3) },
        });
        break;
      case "paragraph": {
        const text: string = block.content?.text || "";
        for (const line of text.split("\n")) {
          doc.push({ type: "paragraph", content: line });
        }
        break;
      }
      case "callout":
        doc.push({
          type: "paragraph",
          content: block.content?.text || "",
        });
        break;
      case "code":
        doc.push({
          type: "codeBlock",
          props: { language: block.content?.language || "plaintext" },
          content: block.content?.text || "",
        });
        break;
      // divider: skip (no BlockNote equivalent)
    }
  }
  return doc;
}

export const migrateDecisionTreeToRichText = migrations.define({
  table: "layouts",
  batchSize: 20,
  migrateOne: async (ctx, layout) => {
    const migrateNodes = (
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
      nodes: any[],
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
    ): { result: any[]; changed: boolean } => {
      let changed = false;
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
      const result = nodes.map((node: any) => {
        // Already migrated
        if (node.document !== undefined) return node;
        const cbs = node.contentBlocks;
        if (!Array.isArray(cbs)) {
          // No contentBlocks and no document → add empty document
          changed = true;
          const { contentBlocks: _, ...rest } = node;
          return { ...rest, document: [] };
        }
        changed = true;
        const document = convertContentBlocksToDocument(cbs);
        const { contentBlocks: _, ...rest } = node;
        return { ...rest, document };
      });
      return { result, changed };
    };

    // biome-ignore lint/suspicious/noExplicitAny: migration raw data
    const processSlots = (slots: any[]) => {
      let dirty = false;
      // biome-ignore lint/suspicious/noExplicitAny: migration raw data
      const cleaned = slots.map((slot: any) => {
        // biome-ignore lint/suspicious/noExplicitAny: migration raw data
        const blocks = (slot.blocks as any[]).map((block: any) => {
          if (block.type !== "decision-tree" || !block.content) return block;
          const c = block.content;

          const newContent = { ...c };

          // Migrate top-level nodes
          if (Array.isArray(c.nodes)) {
            const nodesResult = migrateNodes(c.nodes);
            if (nodesResult.changed) dirty = true;
            newContent.nodes = nodesResult.result;
          }

          // Migrate nodes inside each tree
          if (Array.isArray(c.trees)) {
            // biome-ignore lint/suspicious/noExplicitAny: migration raw data
            newContent.trees = c.trees.map((tree: any) => {
              if (!Array.isArray(tree.nodes)) return tree;
              const treeResult = migrateNodes(tree.nodes);
              if (treeResult.changed) dirty = true;
              return { ...tree, nodes: treeResult.result };
            });
          }

          return { ...block, content: newContent };
        });
        return { ...slot, blocks };
      });
      return { cleaned, dirty };
    };

    // biome-ignore lint/suspicious/noExplicitAny: migration raw data
    const patch: any = {};

    const slotsResult = processSlots(layout.slots);
    if (slotsResult.dirty) patch.slots = slotsResult.cleaned;

    if (layout.publishedSlots) {
      const pubResult = processSlots(layout.publishedSlots);
      if (pubResult.dirty) patch.publishedSlots = pubResult.cleaned;
    }

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = Date.now();
      await ctx.db.patch(layout._id, patch);
    }
  },
});
export const runMigrateDecisionTreeToRichText = migrations.runner([
  internal.migrations.migrateDecisionTreeToRichText,
]);

// Migration 18b: Strip HTML entities (&nbsp; etc.) from plain-text block content
// ContentEditable returns &nbsp; for trailing spaces; the tag-strip regex missed them.
export const stripHtmlEntities = migrations.define({
  table: "layouts",
  batchSize: 5,
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

// ============================================================
// Migration 19: Purge all deployment history
// ============================================================
// The legacy Entity Storage service is being removed.  Old
// deploymentSnapshot rows contain /api/storage/download?path=…
// URLs from the previous provider.  Rolling back to any snapshot
// that was created before the Railway migration would restore
// broken asset references.
//
// Decision: accept no rollback to pre-migration deployments.
// Delete every deployment + snapshot row so the table is clean.
// New deployments after running this migration will only reference
// Railway storage and will be fully rollback-safe.
//
// Run: npx convex run migrations:runPurgeDeploymentHistory
export const purgeDeploymentHistory = migrations.define({
  table: "deployments",
  batchSize: 5,
  migrateOne: async (ctx, deployment) => {
    const snapshots = await ctx.db
      .query("deploymentSnapshots")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deployment._id))
      .collect();

    for (const snapshot of snapshots) {
      await ctx.db.delete(snapshot._id);
    }

    await ctx.db.delete(deployment._id);
  },
});
export const runPurgeDeploymentHistory = migrations.runner([
  internal.migrations.purgeDeploymentHistory,
]);

// Migration 20: Strip legacy cdnUrl from searchableContent.metadata
// ============================================================
// The old Entity Storage provider stored a cdnUrl field in search metadata.
// Temporarily kept in schema to allow old documents to pass validation.
// This migration removes it so the schema field can be dropped.
//
// Run: npx convex run migrations:runStripSearchCdnUrl
export const stripSearchCdnUrl = migrations.define({
  table: "searchableContent",
  batchSize: 50,
  migrateOne: async (ctx, doc) => {
    const meta = doc.metadata as typeof doc.metadata & { cdnUrl?: string };
    if (!meta.cdnUrl) return;
    const { cdnUrl: _removed, ...rest } = meta;
    await ctx.db.patch(doc._id, { metadata: rest });
  },
});
export const runStripSearchCdnUrl = migrations.runner([
  internal.migrations.stripSearchCdnUrl,
]);

// Migration 21: Enforce document listing projection integrity
// ============================================================
// documents is the canonical table. documentListings is a required lightweight
// projection for any document visible in library/file UIs. Rows that do not
// have their counterpart are invalid historical drift and must be removed.
//
// Run:
//   npx convex run --deployment dev --push migrations:runPurgeInvalidDocumentRows
//   npx convex run --deployment prod --push migrations:runPurgeInvalidDocumentRows
export const purgeDocumentsMissingListings = migrations.define({
  table: "documents",
  batchSize: 25,
  migrateOne: async (ctx, document) => {
    const listing = await ctx.db
      .query("documentListings")
      .withIndex("by_document", (q) => q.eq("documentId", document._id))
      .first();

    if (listing) return;

    await deleteDocumentRows(ctx, document);
  },
});

export const purgeListingsMissingDocuments = migrations.define({
  table: "documentListings",
  batchSize: 50,
  migrateOne: async (ctx, listing) => {
    const document = await ctx.db.get(listing.documentId);
    if (document) return;

    await ctx.db.delete(listing._id);
  },
});

export const runPurgeInvalidDocumentRows = migrations.runner([
  internal.migrations.purgeDocumentsMissingListings,
  internal.migrations.purgeListingsMissingDocuments,
]);

// Migration 22: Remove legacy page block openMode
// ============================================================
// Page blocks now always open in a panel. Navigation always navigates.
// Any stored openMode flags are stale historical data and should be removed.
export const removeLegacyPageBlockOpenMode = migrations.define({
  table: "layouts",
  batchSize: 20,
  migrateOne: async (ctx, layout) => {
    const normalizeSlots = (slots: typeof layout.slots) => {
      let changed = false;

      const normalizedSlots: typeof layout.slots = slots.map((slot) => ({
        ...slot,
        blocks: slot.blocks.map((block) => {
          if (block.type !== "page" || !block.content) {
            return block;
          }

          const content = block.content as { openMode?: unknown };
          if (!("openMode" in content)) {
            return block;
          }

          changed = true;
          const { openMode: _removed, ...rest } = content;
          return {
            ...block,
            content: rest,
          } as (typeof slot.blocks)[number];
        }),
      }));

      return { changed, normalizedSlots };
    };

    const draft = normalizeSlots(layout.slots);
    const published = layout.publishedSlots
      ? normalizeSlots(layout.publishedSlots)
      : null;

    if (!draft.changed && !published?.changed) {
      return;
    }

    await ctx.db.patch(layout._id, {
      ...(draft.changed
        ? { slots: draft.normalizedSlots as typeof layout.slots }
        : {}),
      ...(published?.changed
        ? { publishedSlots: published.normalizedSlots as typeof layout.slots }
        : {}),
      updatedAt: Date.now(),
    });
  },
});

export const runRemoveLegacyPageBlockOpenMode = migrations.runner([
  internal.migrations.removeLegacyPageBlockOpenMode,
]);
