export const pageAccessKinds = ["public", "audiences"] as const;

export type PageAccessKind = (typeof pageAccessKinds)[number];

export type PageAccessPolicy =
  | {
      kind: "public";
    }
  | {
      kind: "audiences";
      audienceIds: string[];
    };

export interface SiteAudience {
  _id: string;
  name: string;
  memberCount: number;
}

export const publicPageAccessPolicy = {
  kind: "public",
} satisfies PageAccessPolicy;

export function normalizePageAccessPolicy(
  policy?: PageAccessPolicy | null,
): PageAccessPolicy {
  if (!policy || policy.kind === "public") {
    return publicPageAccessPolicy;
  }

  const audienceIds = Array.from(
    new Set(
      policy.audienceIds.map((audienceId) => audienceId.trim()).filter(Boolean),
    ),
  );

  if (audienceIds.length === 0) {
    return publicPageAccessPolicy;
  }

  return {
    kind: "audiences",
    audienceIds,
  };
}

export function isPageRestricted(policy?: PageAccessPolicy | null): boolean {
  return normalizePageAccessPolicy(policy).kind === "audiences";
}

export function canAccessPagePolicy(
  policy: PageAccessPolicy | null | undefined,
  audienceIds: Iterable<string>,
): boolean {
  const normalizedPolicy = normalizePageAccessPolicy(policy);
  if (normalizedPolicy.kind === "public") {
    return true;
  }

  const allowedAudienceIds = new Set(audienceIds);
  return normalizedPolicy.audienceIds.some((audienceId) =>
    allowedAudienceIds.has(audienceId),
  );
}
