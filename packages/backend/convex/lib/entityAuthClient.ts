/**
 * Entity Auth API client for server-side calls
 * Used by Convex actions to interact with Entity Auth
 */

const ENTITY_AUTH_URL =
  process.env.ENTITY_AUTH_URL ||
  "https://entityy-entity-auth.vercel.app";

/**
 * Entity Auth OrgMember response shape (from social/types.ts)
 * OrgMember = Person & { role: string; joinedAt: number }
 * Person = { id: string; username: string | null; email: string | null; imageUrl: string | null }
 */
interface EAMember {
  id: string;
  username: string | null;
  email: string | null;
  imageUrl: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: number;
}

interface EASearchResult {
  id: string;
  email?: string;
  username?: string;
  imageUrl?: string;
}

interface EAInvitation {
  id: string;
  orgId: string;
  inviteeUserId: string;
  inviteeEmail?: string;
  inviteeUsername?: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: string;
  createdAt: string;
}

interface EAReceivedInvitation {
  id: string;
  orgId: string;
  role: "owner" | "admin" | "member";
  status: string;
  expiresAt: number;
  createdAt: number;
  respondedAt: number | null;
  person: {
    id: string;
    email: string | null;
    username: string | null;
    imageUrl: string | null;
  };
}

interface CreateInvitationResponse {
  invitationId: string;
  token: string;
  expiresAt: string;
}

async function fetchWithAuth<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${ENTITY_AUTH_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || error.error || `Request failed: ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Get organization members from Entity Auth
 */
export async function getOrgMembers(
  orgId: string,
  accessToken: string,
): Promise<EAMember[]> {
  const response = await fetchWithAuth<{ members: EAMember[] }>(
    `/api/social/members?orgId=${encodeURIComponent(orgId)}`,
    accessToken,
  );
  return response.members;
}

/**
 * Search users in Entity Auth
 */
export async function searchUsers(
  query: string,
  accessToken: string,
  limit = 20,
): Promise<EASearchResult[]> {
  const endpoint = `/api/social/search?q=${encodeURIComponent(query)}&limit=${limit}`;

  const response = await fetchWithAuth<{ results: EASearchResult[]; query: string; count: number }>(
    endpoint,
    accessToken,
  );

  return response.results;
}

/**
 * Create an invitation in Entity Auth
 */
export async function createInvitation(
  orgId: string,
  inviteeUserId: string,
  role: "owner" | "admin" | "member",
  accessToken: string,
): Promise<CreateInvitationResponse> {
  const response = await fetchWithAuth<CreateInvitationResponse>(
    "/api/social/invitations",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ orgId, inviteeUserId, role }),
    },
  );
  return response;
}

/**
 * Get sent invitations from Entity Auth
 */
export async function getSentInvitations(
  accessToken: string,
): Promise<EAInvitation[]> {
  const response = await fetchWithAuth<{ sent: EAInvitation[] }>(
    "/api/social/invitations?type=sent",
    accessToken,
  );
  return response.sent || [];
}

/**
 * Get received invitations from Entity Auth (invitations sent TO the current user)
 */
export async function getReceivedInvitations(
  accessToken: string,
): Promise<EAReceivedInvitation[]> {
  const response = await fetchWithAuth<{ received: EAReceivedInvitation[] }>(
    "/api/social/invitations?type=received",
    accessToken,
  );
  return response.received || [];
}

/**
 * Accept an invitation in Entity Auth
 */
export async function acceptInvitation(
  invitationId: string,
  accessToken: string,
): Promise<void> {
  await fetchWithAuth(
    `/api/social/invitations/${encodeURIComponent(invitationId)}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    },
  );
}

/**
 * Decline an invitation in Entity Auth
 */
export async function declineInvitation(
  invitationId: string,
  accessToken: string,
): Promise<void> {
  await fetchWithAuth(
    `/api/social/invitations/${encodeURIComponent(invitationId)}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    },
  );
}

/**
 * Revoke an invitation in Entity Auth
 */
export async function revokeInvitation(
  invitationId: string,
  accessToken: string,
): Promise<void> {
  await fetchWithAuth(
    `/api/social/invitations/${encodeURIComponent(invitationId)}`,
    accessToken,
    { method: "DELETE" },
  );
}

/**
 * Remove a member from an organization in Entity Auth
 */
export async function removeMember(
  orgId: string,
  userId: string,
  accessToken: string,
): Promise<void> {
  await fetchWithAuth(
    `/api/social/members?orgId=${encodeURIComponent(orgId)}&userId=${encodeURIComponent(userId)}`,
    accessToken,
    { method: "DELETE" },
  );
}

/**
 * Map Entity Auth role to BaseBlocks role
 * owner/admin -> admin, member -> viewer
 */
export function mapEARole(eaRole: string): "admin" | "viewer" {
  return eaRole === "owner" || eaRole === "admin" ? "admin" : "viewer";
}

export type { EAMember, EASearchResult, EAInvitation, CreateInvitationResponse };
