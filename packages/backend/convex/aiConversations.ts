import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireOrganizationPermission } from "./permissions";

const MAX_TITLE_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 8_000;
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 100;
const MAX_CONTEXT_MESSAGES = 12;

async function requireConversation(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
  conversationId: Id<"aiConversations">,
) {
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) throw new ConvexError("Conversation not found");
  const { auth } = await requireOrganizationPermission(
    ctx,
    conversation.organizationId,
    { resource: "content", action: "edit" },
  );
  if (conversation.actorId !== auth.userId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Conversation belongs to another user",
    });
  }
  return { auth, conversation };
}

function titleFromMessage(content: string) {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > MAX_TITLE_LENGTH
    ? `${compact.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
    : compact || "New conversation";
}

export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) return [];
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    const conversations = await ctx.db
      .query("aiConversations")
      .withIndex("by_site_actor_updated", (q) =>
        q.eq("siteId", siteId).eq("actorId", auth.userId),
      )
      .order("desc")
      .take(MAX_CONVERSATIONS);
    return conversations.filter((conversation) => !conversation.archivedAt);
  },
});

export const create = mutation({
  args: { siteId: v.id("sites") },
  returns: v.id("aiConversations"),
  handler: async (ctx, { siteId }) => {
    const site = await ctx.db.get(siteId);
    if (!site) throw new ConvexError("Site not found");
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    const now = Date.now();
    return ctx.db.insert("aiConversations", {
      siteId,
      organizationId: site.organizationId,
      actorId: auth.userId,
      title: "New conversation",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const archive = mutation({
  args: { conversationId: v.id("aiConversations") },
  returns: v.null(),
  handler: async (ctx, { conversationId }) => {
    await requireConversation(ctx, conversationId);
    await ctx.db.patch(conversationId, {
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const messages = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, { conversationId }) => {
    await requireConversation(ctx, conversationId);
    return ctx.db
      .query("aiConversationMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("asc")
      .take(MAX_MESSAGES);
  },
});

export const context = query({
  args: { conversationId: v.id("aiConversations") },
  handler: async (ctx, { conversationId }) => {
    await requireConversation(ctx, conversationId);
    const messages = await ctx.db
      .query("aiConversationMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("desc")
      .take(MAX_CONTEXT_MESSAGES);
    return messages.reverse().map(({ role, content }) => ({ role, content }));
  },
});

export const beginTurn = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    requestId: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conversation } = await requireConversation(
      ctx,
      args.conversationId,
    );
    const content = args.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      throw new ConvexError("Invalid conversation message");
    }
    if (args.requestId.length < 16 || args.requestId.length > 200) {
      throw new ConvexError("Invalid conversation request ID");
    }
    const existing = await ctx.db
      .query("aiConversationMessages")
      .withIndex("by_conversation_request_role", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("requestId", args.requestId)
          .eq("role", "user"),
      )
      .unique();
    if (existing) {
      if (existing.content !== content || existing.mode !== "apply") {
        throw new ConvexError("Conversation request ID was already used");
      }
      return null;
    }
    const now = Date.now();
    await ctx.db.insert("aiConversationMessages", {
      conversationId: conversation._id,
      siteId: conversation.siteId,
      actorId: conversation.actorId,
      requestId: args.requestId,
      role: "user",
      content,
      mode: "apply",
      status: "completed",
      createdAt: now,
    });
    const firstMessage = await ctx.db
      .query("aiConversationMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .order("asc")
      .first();
    await ctx.db.patch(conversation._id, {
      title:
        firstMessage?._id === undefined ||
        firstMessage.requestId === args.requestId
          ? titleFromMessage(content)
          : conversation.title,
      updatedAt: now,
    });
    return null;
  },
});

export async function appendCompletedAssistantMessage(
  ctx: GenericMutationCtx<DataModel>,
  args: {
    conversationId: Id<"aiConversations">;
    siteId: Id<"sites">;
    actorId: string;
    requestId: string;
    content: string;
    operationCount: number;
    auditId: Id<"aiChangesetAudits">;
    createdAt: number;
  },
) {
  const { conversation } = await requireConversation(ctx, args.conversationId);
  if (
    conversation.siteId !== args.siteId ||
    conversation.actorId !== args.actorId
  ) {
    throw new ConvexError("Conversation does not belong to this AI run");
  }
  const existing = await ctx.db
    .query("aiConversationMessages")
    .withIndex("by_conversation_request_role", (q) =>
      q
        .eq("conversationId", conversation._id)
        .eq("requestId", args.requestId)
        .eq("role", "assistant"),
    )
    .unique();
  if (existing) return;
  const userMessage = await ctx.db
    .query("aiConversationMessages")
    .withIndex("by_conversation_request_role", (q) =>
      q
        .eq("conversationId", conversation._id)
        .eq("requestId", args.requestId)
        .eq("role", "user"),
    )
    .unique();
  if (!userMessage) throw new ConvexError("User message not found");
  const content = args.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) throw new ConvexError("AI run has no summary");
  await ctx.db.insert("aiConversationMessages", {
    conversationId: conversation._id,
    siteId: conversation.siteId,
    actorId: conversation.actorId,
    requestId: args.requestId,
    role: "assistant",
    content,
    mode: userMessage.mode,
    status: "completed",
    operationCount: args.operationCount,
    auditId: args.auditId,
    createdAt: args.createdAt,
  });
  await ctx.db.patch(conversation._id, { updatedAt: args.createdAt });
}
