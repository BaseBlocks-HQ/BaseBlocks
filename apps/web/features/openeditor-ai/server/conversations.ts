import "server-only";

import { getServerConvexClient } from "@/lib/convex/server";
import type { Id } from "@baseblocks/backend";
import { makeFunctionReference } from "convex/server";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const beginTurn = makeFunctionReference<
  "mutation",
  {
    conversationId: Id<"aiConversations">;
    requestId: string;
    content: string;
  },
  null
>("aiConversations:beginTurn");

const conversationContext = makeFunctionReference<
  "query",
  { conversationId: Id<"aiConversations"> },
  ConversationMessage[]
>("aiConversations:context");

function boundedConversationPrompt(messages: readonly ConversationMessage[]) {
  const budget = 5_500;
  const selected: string[] = [];
  let used = 0;
  for (const message of [...messages].reverse()) {
    const line = `${message.role === "user" ? "User" : "Assistant"}: ${message.content.trim()}`;
    if (used + line.length > budget) break;
    selected.unshift(line);
    used += line.length;
  }
  return [
    "Continue this editor conversation. Earlier assistant messages are summaries of prior workspace runs. Follow the latest user request; use earlier turns only as context.",
    "",
    ...selected,
  ].join("\n");
}

export function createEditorAiConversationBackend(token: string) {
  const convex = getServerConvexClient(token);
  return {
    async begin(input: {
      conversationId: string;
      requestId: string;
      content: string;
    }) {
      const conversationId = input.conversationId as Id<"aiConversations">;
      await convex.mutation(beginTurn, { ...input, conversationId });
      const messages = await convex.query(conversationContext, {
        conversationId,
      });
      return boundedConversationPrompt(messages);
    },
  };
}
