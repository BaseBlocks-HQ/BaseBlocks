export type InboxInvitation = {
  kind: "invitation";
  id: string;
  organizationId: string;
  organizationName?: string;
  role: string;
  expiresAt: Date;
  inviterEmail?: string;
};

export type InboxActivity = {
  kind: "activity";
  id: string;
  activityType: "agentCompleted" | "commentMention" | "documentUpdate";
  title: string;
  description: string;
  occurredAt: Date;
  href?: string;
};

export type InboxItem = InboxInvitation | InboxActivity;

export type InboxSource = {
  id: string;
  list: () => Promise<InboxItem[]>;
};

export type InboxState = {
  items: InboxItem[];
  isLoading: boolean;
  processingId: string | null;
  error: string | null;
};

export type InboxAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; items: InboxItem[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "PROCESS_START"; id: string }
  | { type: "PROCESS_DONE" }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "PROCESS_ERROR"; error: string };

export const initialInboxState: InboxState = {
  items: [],
  isLoading: false,
  processingId: null,
  error: null,
};

export function inboxReducer(
  state: InboxState,
  action: InboxAction,
): InboxState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, isLoading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, isLoading: false, items: action.items };
    case "LOAD_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "PROCESS_START":
      return { ...state, processingId: action.id };
    case "PROCESS_DONE":
      return { ...state, processingId: null };
    case "REMOVE_ITEM":
      return {
        ...state,
        processingId: null,
        items: state.items.filter((item) => item.id !== action.id),
      };
    case "PROCESS_ERROR":
      return { ...state, processingId: null, error: action.error };
  }
}
