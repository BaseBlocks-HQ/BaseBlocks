import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { components } from "./_generated/api";

type MemberPage = {
  page: Array<{ _id: string; userId: string }>;
  continueCursor: string;
  isDone: boolean;
};

/**
 * Provider-neutral seat input owned by Workspace Foundation.
 *
 * Billing providers must consume this snapshot instead of duplicating Better
 * Auth membership rules. Page guests and published visitors are deliberately
 * absent from the calculation.
 */
export const getSeatSnapshot = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, { organizationId }) => {
    let cursor: string | null = null;
    let activeMemberCount = 0;
    const memberIds: string[] = [];

    do {
      const result = (await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "member",
          where: [
            { field: "organizationId", operator: "eq", value: organizationId },
          ],
          paginationOpts: { numItems: 250, cursor },
        },
      )) as MemberPage;
      activeMemberCount += result.page.length;
      memberIds.push(...result.page.map((member) => member._id));
      cursor = result.isDone ? null : result.continueCursor;
    } while (cursor !== null);

    memberIds.sort();

    return {
      organizationId,
      activeMemberCount,
      billableSeatCount: Math.max(1, activeMemberCount),
      memberIds,
      membershipRevision: JSON.stringify(memberIds),
      source: "better-auth-members" as const,
    };
  },
});
