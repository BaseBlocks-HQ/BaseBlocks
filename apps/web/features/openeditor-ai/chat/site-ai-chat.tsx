"use client";

import { MiddleTruncate } from "@/components/tree/middle-truncate";
import { api, type Id } from "@baseblocks/backend";
import {
  ActionRow,
  ActionRowAction,
  ActionRowActions,
  ActionRowLabel,
  ActionRowMain,
} from "@baseblocks/ui/action-row";
import { Bubble, BubbleContent } from "@baseblocks/ui/bubble";
import { Button } from "@baseblocks/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
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
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { Textarea } from "@baseblocks/ui/textarea";
import {
  Add01Icon,
  ArrowDown01Icon,
  BubbleChatSpark01Icon,
  Delete01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function SiteAiChat({
  onApplied,
  siteId,
  siteName,
}: {
  onApplied: () => void;
  siteId: Id<"sites">;
  siteName: string;
}) {
  const chatRef = useRef<HTMLElement>(null);
  const composerSurfaceRef = useRef<HTMLDivElement>(null);
  const conversations = useQuery(api.aiConversations.list, { siteId });
  const createConversation = useMutation(api.aiConversations.create);
  const archiveConversation = useMutation(api.aiConversations.archive);
  const revertChange = useMutation(api.aiChangesets.revert);
  const [conversationId, setConversationId] =
    useState<Id<"aiConversations"> | null>(null);
  const [conversationPickerOpen, setConversationPickerOpen] = useState(false);
  const [archivingConversationId, setArchivingConversationId] =
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

  useEffect(() => {
    const chat = chatRef.current;
    const composerSurface = composerSurfaceRef.current;
    if (!chat || !composerSurface) return;

    const syncComposerInset = () => {
      const chatBounds = chat.getBoundingClientRect();
      const composerBounds = composerSurface.getBoundingClientRect();
      chat.style.setProperty(
        "--chat-composer-inset",
        `${Math.ceil(chatBounds.bottom - composerBounds.top)}px`,
      );
    };
    syncComposerInset();

    const observer = new ResizeObserver(syncComposerInset);
    observer.observe(chat);
    observer.observe(composerSurface);
    return () => observer.disconnect();
  }, []);

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

  const archiveConversationById = async (
    targetConversationId: Id<"aiConversations">,
  ) => {
    if (
      archivingConversationId ||
      (pending && targetConversationId === conversationId)
    ) {
      return;
    }
    setArchivingConversationId(targetConversationId);
    try {
      await archiveConversation({ conversationId: targetConversationId });
      if (targetConversationId === conversationId) {
        setConversationId(null);
        setError(null);
      }
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "The conversation could not be archived",
      );
    } finally {
      setArchivingConversationId(null);
    }
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
        outcome?: "answered" | "applied";
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
      if (payload.outcome === "applied") {
        onApplied();
        toast.success("Site updated");
      }
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
      ref={chatRef}
      aria-label="Chat"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-2.5">
        <Popover
          onOpenChange={setConversationPickerOpen}
          open={conversationPickerOpen}
        >
          <PopoverTrigger asChild>
            <Button
              className="min-w-0 flex-1 justify-start px-2"
              size="sm"
              variant="ghost"
            >
              <HugeiconsIcon
                className="size-4 shrink-0"
                icon={BubbleChatSpark01Icon}
              />
              <span className="truncate">
                {activeConversation?.title ?? "New conversation"}
              </span>
              <HugeiconsIcon
                className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                icon={ArrowDown01Icon}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1" sideOffset={4}>
            {conversations?.length ? (
              <div
                aria-label="Conversations"
                className="flex flex-col gap-px"
                role="list"
              >
                {conversations.map((conversation) => {
                  const active = conversation._id === conversationId;
                  return (
                    <ActionRow
                      className={cn(
                        "group/conversation relative h-7 min-w-0 rounded-md transition-colors hover:bg-accent group-has-[button[data-conversation-actions-trigger]:focus-visible]/conversation:bg-accent",
                        active &&
                          "bg-accent font-medium text-accent-foreground",
                      )}
                      key={conversation._id}
                      role="listitem"
                    >
                      <ActionRowMain
                        aria-current={active ? "true" : undefined}
                        className="flex h-7 w-full min-w-0 items-center overflow-hidden rounded-md px-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        onClick={() => {
                          setConversationId(conversation._id);
                          setConversationPickerOpen(false);
                        }}
                        type="button"
                      >
                        <ActionRowLabel className="flex min-w-0 flex-1">
                          <MiddleTruncate
                            className="flex-1"
                            text={conversation.title}
                          />
                        </ActionRowLabel>
                      </ActionRowMain>
                      <ActionRowActions className="end-1 z-30" side="end">
                        <ActionRowAction
                          aria-label={`Archive ${conversation.title}`}
                          className="flex h-full w-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-100 ease-[cubic-bezier(0.2,0,0,1)] hover:text-destructive focus-visible:text-destructive focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
                          data-conversation-actions-trigger
                          disabled={Boolean(
                            archivingConversationId || (pending && active),
                          )}
                          onClick={() =>
                            void archiveConversationById(conversation._id)
                          }
                          title={`Archive ${conversation.title}`}
                          type="button"
                        >
                          <HugeiconsIcon
                            aria-hidden
                            className="size-3.5"
                            icon={Delete01Icon}
                          />
                        </ActionRowAction>
                      </ActionRowActions>
                    </ActionRow>
                  );
                })}
              </div>
            ) : (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                No conversations yet
              </p>
            )}
          </PopoverContent>
        </Popover>
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
      </header>

      <div className="relative min-h-0 flex-1">
        <MessageScrollerProvider autoScroll scrollPreviousItemPeek={48}>
          <MessageScroller>
            <MessageScrollerViewport className="[--scroll-fade-t-size:2.5rem] [--scroll-fade-b-size:calc(var(--chat-composer-inset,6rem)+1rem)]">
              <MessageScrollerContent className="gap-5 px-4 pt-5 pb-[calc(var(--chat-composer-inset,6rem)+1.25rem)]">
                {displayMessages.length === 0 && !pending ? (
                  <MessageScrollerItem className="my-auto">
                    <ChatEmptyState siteName={siteName} />
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
            <MessageScrollerButton className="z-20 border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[direction=end]:bottom-[calc(var(--chat-composer-inset,6rem)+0.5rem)]" />
          </MessageScroller>
        </MessageScrollerProvider>

        <form
          className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <div
            ref={composerSurfaceRef}
            className="relative rounded-xl bg-sidebar/90 text-sidebar-foreground shadow-lg ring-1 ring-sidebar-border/70 backdrop-blur-xl"
          >
            <Textarea
              aria-label="Ask the editor agent"
              className="max-h-40 min-h-20 resize-none border-0 bg-transparent pr-11 shadow-none focus-visible:ring-0 dark:bg-transparent"
              disabled={Boolean(pending)}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Describe what you want to change…"
              value={input}
            />
            <Button
              aria-label="Send message"
              className="absolute right-2 bottom-2 rounded-full"
              disabled={!input.trim() || Boolean(pending)}
              size="icon-sm"
              type="submit"
            >
              <HugeiconsIcon icon={SentIcon} />
            </Button>
          </div>
        </form>
      </div>
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
          {!user && (message.revertedAt || (message.auditId && revertable)) ? (
            <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
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

function ChatEmptyState({ siteName }: { siteName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <HugeiconsIcon
        aria-hidden="true"
        className="size-6 text-muted-foreground"
        icon={BubbleChatSpark01Icon}
      />
      <p className="max-w-64 text-sm text-muted-foreground">
        What do you want to build in {siteName}?
      </p>
    </div>
  );
}
