import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function buildDraftSummary(ctx: QueryCtx, site: Doc<"sites">) {
  const liveReleaseCandidate = site.liveReleaseId
    ? await ctx.db.get(site.liveReleaseId)
    : null;
  const liveRelease =
    liveReleaseCandidate?.siteId === site._id ? liveReleaseCandidate : null;
  const hasDraftChanges =
    (await ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", site._id))
      .first()) !== null;

  return {
    draftRevision: site.draftRevision,
    liveRelease: liveRelease
      ? { _id: liveRelease._id, number: liveRelease.number }
      : null,
    nextReleaseNumber: site.nextReleaseNumber,
    hasUnpublishedChanges:
      Boolean(site.activeDraftRestoreId) ||
      hasDraftChanges ||
      site.draftBaseReleaseId !== site.liveReleaseId,
  };
}
