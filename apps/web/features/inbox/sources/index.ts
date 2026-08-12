import type { InboxItem, InboxSource } from "../model";
import { invitationInboxSource } from "./invitations";

const inboxSources: readonly InboxSource[] = [invitationInboxSource];

export async function listInboxItems(): Promise<InboxItem[]> {
  const sourceItems = await Promise.all(
    inboxSources.map((source) => source.list()),
  );
  return sourceItems.flat();
}
