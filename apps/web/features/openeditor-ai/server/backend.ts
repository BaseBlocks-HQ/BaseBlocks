import "server-only";

import { getServerConvexClient } from "@/lib/convex/server";
import { api, type Id } from "@baseblocks/backend";
import type { BaseBlocksWorkspaceSnapshot, EditorAiBackend } from "./types";

export function createConvexEditorAiBackend(token: string): EditorAiBackend {
  const convex = getServerConvexClient(token);
  return {
    exportDraft: (siteId) =>
      convex.query(api.aiWorkspaces.exportDraft, {
        siteId: siteId as Id<"sites">,
      }) as Promise<BaseBlocksWorkspaceSnapshot | null>,
    applyChangeset: async (input) =>
      convex.mutation(api.aiChangesets.apply, {
        ...input,
        siteId: input.siteId as Id<"sites">,
        conversationId: input.conversationId as
          | Id<"aiConversations">
          | undefined,
        expectedContentHashes: input.expectedContentHashes.map((value) => ({
          ...value,
          pageId: value.pageId as Id<"pages">,
        })),
        operations: input.operations.map((operation) =>
          operation.kind === "create"
            ? operation
            : { ...operation, pageId: operation.pageId as Id<"pages"> },
        ),
      }) as ReturnType<EditorAiBackend["applyChangeset"]>,
  };
}
