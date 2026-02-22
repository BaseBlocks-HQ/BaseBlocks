import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import { extractBlockNoteText } from "./extractBlockNoteText";

type MutationCtx = GenericMutationCtx<DataModel>;

/**
 * Extract searchable text from all blocks across a page's layouts.
 */
function extractTextFromSlots(
  slots: Array<{
    blocks: Array<{ type: string; content: Record<string, unknown> }>;
  }>,
): string {
  const parts: string[] = [];

  for (const slot of slots) {
    for (const block of slot.blocks) {
      const c = block.content;
      if (!c) continue;

      switch (block.type) {
        case "richtext":
          if (Array.isArray(c.document)) {
            parts.push(extractBlockNoteText(c.document));
          }
          break;
        case "heading":
        case "paragraph":
          if (typeof c.text === "string") parts.push(c.text);
          break;
        case "callout":
          if (typeof c.title === "string") parts.push(c.title);
          if (typeof c.text === "string") parts.push(c.text);
          break;
        case "banner":
          if (typeof c.title === "string") parts.push(c.title);
          if (typeof c.description === "string") parts.push(c.description);
          break;
        case "code":
          if (typeof c.code === "string") parts.push(c.code);
          break;
        case "quicklinks":
          if (Array.isArray(c.links)) {
            for (const link of c.links) {
              if (typeof link?.title === "string") parts.push(link.title);
              if (typeof link?.description === "string")
                parts.push(link.description);
            }
          }
          break;
        default:
          // For other block types, try extracting common text fields
          if (typeof c.text === "string") parts.push(c.text);
          if (typeof c.title === "string") parts.push(c.title);
          if (typeof c.description === "string") parts.push(c.description);
          break;
      }
    }
  }

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Index or update a subpage's content in searchableContent.
 *
 * Call this from layout mutations when the page is a subpage content page
 * (`isSubpageContent === true`). Uses the page ID as the sourceId.
 */
export async function indexSubpageContent(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const page = await ctx.db.get(pageId);
  if (!page || !page.isSubpageContent) return;

  // Get all layouts for this subpage
  const layouts = await ctx.db
    .query("layouts")
    .withIndex("by_page", (q) => q.eq("pageId", pageId))
    .collect();

  // Extract text from all layout slots
  const extractedText = layouts
    .map((l) => extractTextFromSlots(l.slots))
    .filter(Boolean)
    .join(" ")
    .trim();

  const combinedText = `${page.title} ${extractedText}`.trim();
  if (!combinedText) return;

  // Upsert into searchableContent
  const existing = await ctx.db
    .query("searchableContent")
    .withIndex("by_source", (q) =>
      q.eq("contentType", "subpage").eq("sourceId", pageId),
    )
    .first();

  const indexData = {
    siteId: page.siteId,
    contentType: "subpage" as const,
    sourceId: pageId,
    title: page.title,
    extractedText: combinedText,
    metadata: {
      pageId: page._id,
    },
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, indexData);
  } else {
    await ctx.db.insert("searchableContent", indexData);
  }
}

/**
 * Remove a subpage's searchableContent entry.
 * Call when a subpage is deleted.
 */
export async function removeSubpageIndex(
  ctx: MutationCtx,
  pageId: Id<"pages">,
): Promise<void> {
  const existing = await ctx.db
    .query("searchableContent")
    .withIndex("by_source", (q) =>
      q.eq("contentType", "subpage").eq("sourceId", pageId),
    )
    .first();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
}
