import { describe, expect, test } from "bun:test";
import { getConversationTranscriptState } from "./conversation-state";

describe("getConversationTranscriptState", () => {
  test("shows an empty transcript immediately for a new conversation", () => {
    expect(
      getConversationTranscriptState({
        composingNewConversation: true,
        conversationsLoaded: true,
        conversationId: null,
        hasConversations: true,
        messagesLoaded: false,
      }),
    ).toEqual({ loading: false, ready: true });
  });

  test("loads a selected persisted conversation until its messages arrive", () => {
    expect(
      getConversationTranscriptState({
        composingNewConversation: false,
        conversationsLoaded: true,
        conversationId: "conversation-1",
        hasConversations: true,
        messagesLoaded: false,
      }),
    ).toEqual({ loading: true, ready: false });
  });
});
