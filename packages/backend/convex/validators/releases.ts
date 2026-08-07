import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";

export const releaseEntityType = v.union(
  v.literal("site"),
  v.literal("page"),
  v.literal("library"),
  v.literal("folder"),
  v.literal("file"),
);

export const releaseChangeType = v.union(
  v.literal("added"),
  v.literal("updated"),
  v.literal("deleted"),
  v.literal("moved"),
);

export const releaseSummaryValidator = v.object({
  _id: v.id("siteReleases"),
  number: v.number(),
  previousReleaseId: v.optional(v.id("siteReleases")),
  createdAt: v.number(),
  pageCount: v.number(),
  changeCount: v.number(),
  isLive: v.boolean(),
});

export function releaseSummary(
  release: Doc<"siteReleases">,
  liveReleaseId: Id<"siteReleases"> | undefined,
) {
  return {
    _id: release._id,
    number: release.number,
    previousReleaseId: release.previousReleaseId,
    createdAt: release.createdAt,
    pageCount: release.pageCount,
    changeCount: release.changeCount,
    isLive: release._id === liveReleaseId,
  };
}
