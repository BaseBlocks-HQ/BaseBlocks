"use client";

import { api, type Id } from "@baseblocks/backend";
import { Bubble, BubbleContent } from "@baseblocks/ui/bubble";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@baseblocks/ui/empty";
import { Marker, MarkerContent, MarkerIcon } from "@baseblocks/ui/marker";
import { Message, MessageContent } from "@baseblocks/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@baseblocks/ui/message-scroller";
import { Spinner } from "@baseblocks/ui/spinner";
import { Textarea } from "@baseblocks/ui/textarea";
import {
  Add01Icon,
  AiChat02Icon,
  ArrowDown01Icon,
  Cancel01Icon,
  Delete02Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const SUGGESTED_PROMPTS = [
  "Make terminology consistent across every page. Replace “workspace” with “project” in user-facing content, while preserving URLs and code.",
  "Reorganize this site into Getting started, Guides, and Reference. Preserve existing page IDs, repair internal links, and create concise section introductions.",
] as const;

export function SiteAiChat({
  onApplied,
  onClose,
  siteId,
}: {
  onApplied: () => void;
  onClose: () => void;
  siteId: Id<"sites">;
}) {
  const conversations = useQuery(api.aiConversations.list, { siteId });
  const createConversation = useMutation(api.aiConversations.create);
  const archiveConversation = useMutation(api.aiConversations.archive);
  const revertChange = useMutation(api.aiChangesets.revert);
  const [conversationId, setConversationId] =
    useState<Id<"aiConversations"> | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{
    requestId: string;
    content: string;
  } | null>(null);
  const [revertingMessageId, setRevertingMessageId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const messages = useQuery(
    api.aiConversations.messages,
    conversationId ? { conversationId } : "skip",
  );

  useEffect(() => {
    const firstConversation = conversations?.[0];
    if (conversationId || !firstConversation) return;
    setConversationId(firstConversation._id);
  }, [conversationId, conversations]);

  const activeConversation = conversations?.find(
    (conversation) => conversation._id === conversationId,
  );
  const pendingIsPersisted = Boolean(
    pending &&
      messages?.some(
        (message) =>
          message.requestId === pending.requestId && message.role === "user",
      ),
  );
  const displayMessages = useMemo(() => messages ?? [], [messages]);
  const revertableMessageId = [...displayMessages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        message.auditId !== undefined &&
        message.revertedAt === undefined,
    )?._id;

  const startConversation = async () => {
    const id = await createConversation({ siteId });
    setConversationId(id);
    setError(null);
    setInput("");
    return id;
  };

  const archiveCurrent = async () => {
    if (!conversationId || pending) return;
    await archiveConversation({ conversationId });
    setConversationId(null);
    setError(null);
  };

  const send = async (content: string) => {
    const prompt = content.trim();
    if (!prompt || pending) return;
    const targetConversationId = conversationId ?? (await startConversation());
    const requestId = crypto.randomUUID();
    setInput("");
    setError(null);
    setPending({ requestId, content: prompt });
    try {
      const response = await fetch(`/api/sites/${siteId}/ai/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestId,
        },
        body: JSON.stringify({
          conversationId: targetConversationId,
          prompt,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        summary?: string;
        diagnostics?: Array<{ message?: unknown; path?: unknown }>;
      };
      if (!response.ok) {
        const details = payload.diagnostics
          ?.slice(0, 3)
          .flatMap((diagnostic) =>
            typeof diagnostic.message === "string"
              ? [
                  (typeof diagnostic.path === "string"
                    ? diagnostic.path.concat(": ")
                    : "") + diagnostic.message,
                ]
              : [],
          )
          .join(" · ");
        throw new Error(
          [payload.error || "The editor agent could not finish", details]
            .filter(Boolean)
            .join(": "),
        );
      }
      onApplied();
      toast.success("Site updated");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "The editor agent failed";
      setError(message);
      toast.error(message);
    } finally {
      setPending(null);
    }
  };

  const revert = async (message: {
    _id: string;
    auditId?: Id<"aiChangesetAudits">;
  }) => {
    if (!message.auditId || revertingMessageId) return;
    setRevertingMessageId(message._id);
    setError(null);
    try {
      await revertChange({
        auditId: message.auditId,
        messageId: message._id as Id<"aiConversationMessages">,
      });
      onApplied();
      toast.success("AI changes reverted");
    } catch (cause) {
      const failure =
        cause instanceof Error
          ? cause.message
          : "The change could not be reverted";
      setError(failure);
      toast.error(failure);
    } finally {
      setRevertingMessageId(null);
    }
  };

  return (
    <section
      aria-label="Editor AI"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="min-w-0 flex-1 justify-start px-2"
              size="sm"
              variant="ghost"
            >
              <HugeiconsIcon className="size-4 shrink-0" icon={AiChat02Icon} />
              <span className="truncate">
                {activeConversation?.title ?? "New conversation"}
              </span>
              <HugeiconsIcon
                className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                icon={ArrowDown01Icon}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {conversations?.length ? (
              conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation._id}
                  onSelect={() => setConversationId(conversation._id)}
                >
                  <span className="truncate">{conversation.title}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>No conversations yet</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          aria-label="Start a new conversation"
          disabled={Boolean(pending)}
          onClick={() => void startConversation()}
          size="icon-sm"
          title="New conversation"
          variant="ghost"
        >
          <HugeiconsIcon icon={Add01Icon} />
        </Button>
        <Button
          aria-label="Archive conversation"
          disabled={!conversationId || Boolean(pending)}
          onClick={() => void archiveCurrent()}
          size="icon-sm"
          title="Archive conversation"
          variant="ghost"
        >
          <HugeiconsIcon icon={Delete02Icon} />
        </Button>
        <Button
          aria-label="Close AI panel"
          onClick={onClose}
          size="icon-sm"
          title="Close AI panel"
          variant="ghost"
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      </header>

      <div className="min-h-0 flex-1">
        <MessageScrollerProvider autoScroll scrollPreviousItemPeek={48}>
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent className="gap-5 px-4 py-5">
                {displayMessages.length === 0 && !pending ? (
                  <MessageScrollerItem className="my-auto">
                    <ChatEmptyState onPrompt={(prompt) => void send(prompt)} />
                  </MessageScrollerItem>
                ) : null}
                {displayMessages.map((message) => (
                  <ConversationMessage
                    key={message._id}
                    message={message}
                    onRevert={(value) => void revert(value)}
                    revertable={revertableMessageId === message._id}
                    reverting={revertingMessageId === message._id}
                  />
                ))}
                {pending && !pendingIsPersisted ? (
                  <ConversationMessage
                    message={{
                      _id: pending.requestId,
                      content: pending.content,
                      requestId: pending.requestId,
                      role: "user",
                      status: "completed",
                    }}
                  />
                ) : null}
                {pending ? (
                  <MessageScrollerItem
                    messageId={`${pending.requestId}-status`}
                  >
                    <Marker>
                      <MarkerIcon>
                        <Spinner className="size-4" />
                      </MarkerIcon>
                      <MarkerContent className="shimmer">
                        Editing and validating the site…
                      </MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
                {error ? (
                  <MessageScrollerItem messageId="latest-error">
                    <Marker className="text-destructive" variant="border">
                      <MarkerContent>{error}</MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </div>

      <form
        className="shrink-0 border-t bg-background p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <div className="relative">
          <Textarea
            aria-label="Ask the editor agent"
            className="max-h-40 min-h-20 resize-none pr-11"
            disabled={Boolean(pending)}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            placeholder="Describe what you want to change…"
            value={input}
          />
          <Button
            aria-label="Send message"
            className="absolute right-2 bottom-2"
            disabled={!input.trim() || Boolean(pending)}
            size="icon-sm"
            type="submit"
          >
            <HugeiconsIcon icon={SentIcon} />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </section>
  );
}

function ConversationMessage({
  message,
  onRevert,
  revertable = false,
  reverting = false,
}: {
  message: {
    _id: string;
    content: string;
    requestId: string;
    role: "user" | "assistant";
    status: "completed";
    auditId?: Id<"aiChangesetAudits">;
    revertedAt?: number;
  };
  onRevert?: (message: {
    _id: string;
    auditId?: Id<"aiChangesetAudits">;
  }) => void;
  revertable?: boolean;
  reverting?: boolean;
}) {
  const user = message.role === "user";
  return (
    <MessageScrollerItem messageId={message._id} scrollAnchor={user}>
      <Message align={user ? "end" : "start"}>
        <MessageContent>
          <Bubble variant={user ? "default" : "ghost"}>
            <BubbleContent className="whitespace-pre-wrap">
              {message.content}
            </BubbleContent>
          </Bubble>
          {!user ? (
            <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              <span>Editor AI</span>
              {message.revertedAt ? (
                <span>Reverted</span>
              ) : message.auditId && revertable ? (
                <Button
                  className="h-6 px-2 text-[11px]"
                  disabled={reverting}
                  onClick={() => onRevert?.(message)}
                  size="xs"
                  variant="ghost"
                >
                  {reverting ? (
                    <>
                      <Spinner />
                      Reverting…
                    </>
                  ) : (
                    "Revert"
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  );
}

function ChatEmptyState({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <Empty className="px-2 py-8">
      <EmptyHeader>
        <EmptyTitle>Edit this site with AI</EmptyTitle>
        <EmptyDescription className="max-w-64 text-xs">
          Describe a change and the agent will apply it to the site. Every agent
          change can be reverted from the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="grid gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            className="h-auto justify-start whitespace-normal p-3 text-left text-xs leading-relaxed"
            key={prompt}
            onClick={() => onPrompt(prompt)}
            type="button"
            variant="outline"
          >
            {prompt}
          </Button>
        ))}
      </EmptyContent>
    </Empty>
  );
}
