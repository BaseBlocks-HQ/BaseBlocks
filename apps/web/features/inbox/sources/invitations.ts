import { authClient } from "@/lib/auth/client";
import type { InboxInvitation, InboxSource } from "../model";

type AuthInvitation = {
  id: string;
  organizationId: string;
  organizationName?: string;
  role?: string;
  expiresAt: string | number | Date;
  inviterEmail?: string;
  status: string;
};

export async function listInvitationItems(): Promise<InboxInvitation[]> {
  const result = await authClient.organization.listUserInvitations();
  if (result.error) throw result.error;

  return ((result.data ?? []) as AuthInvitation[])
    .filter((invitation) => invitation.status === "pending")
    .map((invitation) => ({
      kind: "invitation",
      id: invitation.id,
      organizationId: invitation.organizationId,
      organizationName: invitation.organizationName,
      role: invitation.role || "viewer",
      expiresAt: new Date(invitation.expiresAt),
      inviterEmail: invitation.inviterEmail,
    }));
}

export const invitationInboxSource: InboxSource = {
  id: "invitations",
  list: listInvitationItems,
};
