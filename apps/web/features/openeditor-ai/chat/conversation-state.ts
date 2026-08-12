export function getConversationTranscriptState({
  composingNewConversation,
  conversationsLoaded,
  conversationId,
  hasConversations,
  messagesLoaded,
}: {
  composingNewConversation: boolean;
  conversationsLoaded: boolean;
  conversationId: string | null;
  hasConversations: boolean;
  messagesLoaded: boolean;
}) {
  if (composingNewConversation) return { loading: false, ready: true };

  const loading =
    !conversationsLoaded ||
    (conversationId === null && hasConversations) ||
    (conversationId !== null && !messagesLoaded);

  return {
    loading,
    ready:
      conversationsLoaded &&
      ((conversationId === null && !hasConversations) || messagesLoaded),
  };
}
