"use client";

import { MiddleTruncate } from "@/components/tree/middle-truncate";
import { getTeamBillingPath } from "@/features/dashboard/routes";
import { Link } from "@/i18n/navigation";
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
import { AgentActivity, PendingAgentActivity } from "./agent-activity";
import { getConversationTranscriptState } from "./conversation-state";

export function SiteAiChat({
  availabilityReason,
  onApplied,
  siteId,
  siteName,
  teamSlug,
}: {
  availabilityReason: "available" | "creditsRequired" | "siteNotFound";
  onApplied: () => void;
  siteId: Id<"sites">;
  siteName: string;
  teamSlug: string;
}) {
  if (availabilityReason !== "available") {
    return (
      <AiUnavailableState reason={availabilityReason} teamSlug={teamSlug} />
    );
  }
  return (
    <EnabledSiteAiChat
      onApplied={onApplied}
      siteId={siteId}
      siteName={siteName}
    />
  );
}

function AiUnavailableState({
  reason,
  teamSlug,
}: {
  reason: Exclude<
    Parameters<typeof SiteAiChat>[0]["availabilityReason"],
    "available"
  >;
  teamSlug: string;
}) {
  const needsCredits = reason === "creditsRequired";
  return (
    <section
      aria-label="Chat"
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 text-sm font-medium">
        <HugeiconsIcon className="size-4" icon={BubbleChatSpark01Icon} />
        Chat
      </header>
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-xs space-y-3">
          <h2 className="font-semibold">
            {needsCredits ? "Add AI credits to continue" : "Site unavailable"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {needsCredits
              ? "Buy prepaid credits from Billing, or upgrade to Plus for included credits."
              : "This site could not be found or is no longer available."}
          </p>
          {needsCredits ? (
            <Button asChild>
              <Link href={getTeamBillingPath(teamSlug)}>Open Billing</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EnabledSiteAiChat({
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
  const observedApplicationsRef = useRef(new Set<string>());
  const applicationsInitializedRef = useRef(false);
  const observedConversationIdRef =
    useRef<Id<"siteAssistantConversations"> | null>(null);
  const conversations = useQuery(api.siteAssistantRuns.listConversations, {
    siteId,
  });
  const submitTurn = useMutation(api.siteAssistantRuns.submitTurn);
  const cancelRun = useMutation(api.siteAssistantRuns.cancelRun);
  const archiveConversation = useMutation(
    api.siteAssistantRuns.archiveConversation,
  );
  const revertChange = useMutation(api.siteAssistantRuns.revertApplication);
  const [conversationId, setConversationId] =
    useState<Id<"siteAssistantConversations"> | null>(null);
  const [conversationPickerOpen, setConversationPickerOpen] = useState(false);
  const [composingNewConversation, setComposingNewConversation] =
    useState(false);
  const [archivingConversationId, setArchivingConversationId] =
    useState<Id<"siteAssistantConversations"> | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState<{
    requestId: string;
    messageId: string;
    content: string;
  } | null>(null);
  const [revertingMessageId, setRevertingMessageId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const conversationView = useQuery(
    api.siteAssistantRuns.conversation,
    conversationId ? { conversationId } : "skip",
  );
  const messages = conversationView?.messages;

  useEffect(() => {
    const firstConversation = conversations?.[0];
    if (conversationId || composingNewConversation || !firstConversation)
      return;
    setConversationId(firstConversation._id);
  }, [composingNewConversation, conversationId, conversations]);

  useEffect(() => {
    if (
      submitting &&
      messages?.some((message) => message.id === submitting.messageId)
    ) {
      setSubmitting(null);
    }
  }, [messages, submitting]);

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

  const activeConversation =
    conversationView?.conversation ??
    conversations?.find((conversation) => conversation._id === conversationId);
  const activeRun = [...(messages ?? [])]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        (message.run?.status === "queued" || message.run?.status === "running"),
    )?.run;
  const pending = Boolean(submitting || activeRun);
  const pendingIsPersisted = Boolean(
    submitting &&
      messages?.some((message) => message.id === submitting.messageId),
  );
  const displayMessages = useMemo(() => messages ?? [], [messages]);
  const transcriptState = getConversationTranscriptState({
    composingNewConversation,
    conversationsLoaded: conversations !== undefined,
    conversationId,
    hasConversations: Boolean(conversations?.length),
    messagesLoaded: messages !== undefined,
  });

  useEffect(() => {
    if (!messages) return;
    if (observedConversationIdRef.current !== conversationId) {
      observedApplicationsRef.current.clear();
      applicationsInitializedRef.current = false;
      observedConversationIdRef.current = conversationId;
    }
    const applications = messages.flatMap((message) =>
      message.parts.flatMap((part) => {
        if (!part || typeof part !== "object") return [];
        const record = part as Record<string, unknown>;
        return (record.type === "workspace-applied" ||
          record.type === "data-workspace-applied") &&
          typeof record.auditId === "string"
          ? [record.auditId]
          : [];
      }),
    );
    const seen = observedApplicationsRef.current;
    if (!applicationsInitializedRef.current) {
      for (const auditId of applications) seen.add(auditId);
      applicationsInitializedRef.current = true;
      return;
    }
    const fresh = applications.filter((auditId) => !seen.has(auditId));
    if (fresh.length === 0) return;
    for (const auditId of fresh) seen.add(auditId);
    onApplied();
    toast.success("Site updated");
  }, [conversationId, messages, onApplied]);
  const startConversation = () => {
    setConversationId(null);
    setComposingNewConversation(true);
    setError(null);
    setInput("");
  };

  const archiveConversationById = async (
    targetConversationId: Id<"siteAssistantConversations">,
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
    const requestId = crypto.randomUUID();
    const messageId = crypto.randomUUID();
    setInput("");
    setError(null);
    setSubmitting({ requestId, messageId, content: prompt });
    try {
      const result = await submitTurn({
        siteId,
        conversationId: conversationId ?? undefined,
        requestId,
        message: { id: messageId, parts: [{ type: "text", text: prompt }] },
      });
      setComposingNewConversation(false);
      setConversationId(result.conversationId);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "The editor agent failed";
      setError(message);
      setInput((current) => (current.trim() ? current : prompt));
      setSubmitting(null);
      toast.error(message);
    }
  };

  const revert = async (message: {
    id: string;
    auditId?: Id<"siteAssistantApplications">;
  }) => {
    if (!message.auditId || revertingMessageId) return;
    setRevertingMessageId(message.id);
    setError(null);
    try {
      await revertChange({ auditId: message.auditId });
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
                          setComposingNewConversation(false);
                          setConversationPickerOpen(false);
                        }}
                        disabled={Boolean(pending)}
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
          onClick={startConversation}
          size="icon-sm"
          title="New conversation"
          variant="ghost"
        >
          <HugeiconsIcon icon={Add01Icon} />
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        <MessageScrollerProvider
          autoScroll
          defaultScrollPosition="last-anchor"
          scrollPreviousItemPeek={48}
        >
          <MessageScroller>
            <MessageScrollerViewport className="[--scroll-fade-t-size:2.5rem] [--scroll-fade-b-size:calc(var(--chat-composer-inset,6rem)+1rem)]">
              <MessageScrollerContent
                aria-busy={Boolean(pending)}
                className="gap-5 px-4 pt-5 pb-[calc(var(--chat-composer-inset,6rem)+1.25rem)]"
              >
                {transcriptState.loading ? (
                  <MessageScrollerItem messageId="messages-loading">
                    <Marker role="status">
                      <MarkerIcon>
                        <Spinner className="size-4" />
                      </MarkerIcon>
                      <MarkerContent className="shimmer">
                        Loading conversation…
                      </MarkerContent>
                    </Marker>
                  </MessageScrollerItem>
                ) : null}
                {transcriptState.ready &&
                displayMessages.length === 0 &&
                !pending ? (
                  <MessageScrollerItem className="my-auto">
                    <ChatEmptyState siteName={siteName} />
                  </MessageScrollerItem>
                ) : null}
                {displayMessages.map((message) => (
                  <ConversationMessage
                    key={message.id}
                    message={message}
                    onRevert={(value) => void revert(value)}
                    reverting={revertingMessageId === message.id}
                  />
                ))}
                {submitting && !pendingIsPersisted ? (
                  <ConversationMessage
                    message={{
                      id: submitting.messageId,
                      parts: [{ type: "text", text: submitting.content }],
                      role: "user",
                    }}
                  />
                ) : null}
                {submitting && !activeRun ? (
                  <MessageScrollerItem
                    messageId={`${submitting.requestId}-status`}
                  >
                    <PendingAgentActivity
                      requestPersisted={pendingIsPersisted}
                    />
                  </MessageScrollerItem>
                ) : null}
                {error ? (
                  <MessageScrollerItem messageId="latest-error">
                    <Marker
                      className="text-destructive"
                      role="alert"
                      variant="border"
                    >
                      <MarkerContent>
                        {error} Your message is back in the composer so you can
                        review it and try again.
                      </MarkerContent>
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
              disabled={pending}
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
            {activeRun ? (
              <Button
                aria-label="Stop agent"
                className="absolute right-2 bottom-2 rounded-full"
                onClick={() => void cancelRun({ runId: activeRun.id })}
                size="sm"
                type="button"
                variant="secondary"
              >
                Stop
              </Button>
            ) : (
              <Button
                aria-label="Send message"
                className="absolute right-2 bottom-2 rounded-full"
                disabled={!input.trim() || pending}
                size="icon-sm"
                type="submit"
              >
                <HugeiconsIcon icon={SentIcon} />
              </Button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function ConversationMessage({
  message,
  onRevert,
  reverting = false,
}: {
  message: {
    id: string;
    parts: unknown[];
    role: "user" | "assistant";
    run?: {
      id: Id<"siteAssistantRuns">;
      status: "queued" | "running" | "completed" | "failed" | "cancelled";
      failureMessage?: string;
      revertedAt?: number;
    };
  };
  onRevert?: (message: {
    id: string;
    auditId?: Id<"siteAssistantApplications">;
  }) => void;
  reverting?: boolean;
}) {
  const user = message.role === "user";
  const text = message.parts
    .flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const record = part as Record<string, unknown>;
      return record.type === "text" && typeof record.text === "string"
        ? [record.text]
        : [];
    })
    .join("\n");
  const applied = [...message.parts].reverse().find((part) => {
    if (!part || typeof part !== "object") return false;
    const type = (part as Record<string, unknown>).type;
    return type === "workspace-applied" || type === "data-workspace-applied";
  }) as Record<string, unknown> | undefined;
  const auditId =
    typeof applied?.auditId === "string"
      ? (applied.auditId as Id<"siteAssistantApplications">)
      : undefined;
  const revertedAt = message.run?.revertedAt;
  const running =
    message.run?.status === "queued" || message.run?.status === "running";
  return (
    <MessageScrollerItem messageId={message.id} scrollAnchor={user}>
      <Message align={user ? "end" : "start"}>
        <MessageContent>
          {!user ? <AgentActivity source={message} /> : null}
          {text ? (
            <Bubble variant={user ? "default" : "ghost"}>
              <BubbleContent className="whitespace-pre-wrap">
                {text}
              </BubbleContent>
            </Bubble>
          ) : null}
          {!user && running ? <PendingAgentActivity requestPersisted /> : null}
          {!user && message.run?.status === "failed" ? (
            <Marker className="text-destructive" role="alert" variant="border">
              <MarkerContent>
                {message.run.failureMessage ?? "The agent could not finish."}
              </MarkerContent>
            </Marker>
          ) : null}
          {!user && (revertedAt || auditId) ? (
            <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
              {revertedAt ? (
                <span>Reverted</span>
              ) : auditId && message.run ? (
                <Button
                  className="h-6 px-2 text-[11px]"
                  disabled={reverting}
                  onClick={() =>
                    onRevert?.({
                      id: message.id,
                      auditId,
                    })
                  }
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
