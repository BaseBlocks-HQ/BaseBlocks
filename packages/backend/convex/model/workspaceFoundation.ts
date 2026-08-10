export const WORKSPACE_PROFILE_SCHEMA_VERSION = 1;
export const WORKSPACE_INTENT_MIGRATION_KEY = "workspace-intent-v1";

export type WorkspaceIntent = "personal" | "work";
export type WorkspaceProfileSource =
  | "onboarding"
  | "migration"
  | "lazyPersonal";
export type PageGuestPermission = "viewer" | "editor";

export type WorkspaceCreationHint = {
  intent: WorkspaceIntent;
  source: Extract<WorkspaceProfileSource, "onboarding" | "lazyPersonal">;
};

export function parseWorkspaceCreationHint(
  metadata: unknown,
): WorkspaceCreationHint | null {
  if (typeof metadata === "string") {
    try {
      return parseWorkspaceCreationHint(JSON.parse(metadata));
    } catch {
      return null;
    }
  }
  if (!metadata || typeof metadata !== "object") return null;
  const baseblocks = (metadata as { baseblocks?: unknown }).baseblocks;
  if (!baseblocks || typeof baseblocks !== "object") return null;
  const { intent, source } = baseblocks as {
    intent?: unknown;
    source?: unknown;
  };
  if (intent !== "personal" && intent !== "work") return null;
  if (source !== "onboarding" && source !== "lazyPersonal") return null;
  if (source === "lazyPersonal" && intent !== "personal") return null;
  return { intent, source };
}

export function classifyWorkspaceIntent(
  memberCount: number,
): WorkspaceIntent | null {
  if (!Number.isSafeInteger(memberCount) || memberCount < 1) return null;
  return memberCount === 1 ? "personal" : "work";
}

export function normalizeGuestEmail(email: string): string {
  return email.trim().toLocaleLowerCase("en-US");
}

export function strongestGuestPermission(
  permissions: PageGuestPermission[],
): PageGuestPermission | null {
  if (permissions.includes("editor")) return "editor";
  return permissions.includes("viewer") ? "viewer" : null;
}

export function guestPermissionAllows(
  permission: PageGuestPermission | null,
  required: PageGuestPermission,
): boolean {
  if (permission === "editor") return true;
  return permission === "viewer" && required === "viewer";
}

export function resolveGuestPagePermissions(input: {
  pages: Array<{ id: string; parentId?: string; deleted?: boolean }>;
  grants: Array<{
    pageId: string;
    permission: PageGuestPermission;
    active: boolean;
  }>;
}): Map<string, PageGuestPermission> {
  const children = new Map<string, string[]>();
  for (const page of input.pages) {
    if (page.deleted) continue;
    const key = page.parentId ?? "";
    children.set(key, [...(children.get(key) ?? []), page.id]);
  }
  const result = new Map<string, PageGuestPermission>();
  for (const grant of input.grants) {
    if (!grant.active) continue;
    const queue = [grant.pageId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const pageId = queue.shift();
      if (!pageId || visited.has(pageId)) continue;
      visited.add(pageId);
      const current = result.get(pageId);
      result.set(
        pageId,
        strongestGuestPermission(
          current ? [current, grant.permission] : [grant.permission],
        )!,
      );
      queue.push(...(children.get(pageId) ?? []));
    }
  }
  return result;
}
