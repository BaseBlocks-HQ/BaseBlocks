import { describe, expect, test } from "bun:test";
import {
  classifyAccountDeletionWorkspaces,
  MAX_OWNED_ORGANIZATIONS,
  countOwnedOrganizations,
  getPrimaryOrganizationRole,
  hasOrganizationRole,
  hasReachedOwnedOrganizationLimit,
  parseOrganizationRoles,
} from "./organizationPolicy";

describe("organization ownership policy", () => {
  test("normalizes comma-separated Better Auth roles", () => {
    expect(parseOrganizationRoles(" admin, owner ,editor ")).toEqual([
      "admin",
      "owner",
      "editor",
    ]);
    expect(hasOrganizationRole("admin,owner", "owner")).toBe(true);
    expect(hasOrganizationRole("admin", "owner")).toBe(false);
    expect(getPrimaryOrganizationRole("viewer,owner")).toBe("owner");
    expect(getPrimaryOrganizationRole("viewer,editor")).toBe("editor");
  });

  test("counts only owned organizations, not joined organizations", () => {
    expect(
      countOwnedOrganizations([
        { role: "owner" },
        { role: "admin" },
        { role: "editor" },
        { role: "owner,editor" },
      ]),
    ).toBe(2);
  });

  test("enforces the agreed ten-owned organization entitlement", () => {
    const nineOwned = Array.from({ length: 9 }, () => ({ role: "owner" }));
    const tenOwned = [...nineOwned, { role: "owner" }];
    expect(MAX_OWNED_ORGANIZATIONS).toBe(10);
    expect(hasReachedOwnedOrganizationLimit(nineOwned)).toBe(false);
    expect(hasReachedOwnedOrganizationLimit(tenOwned)).toBe(true);
    expect(
      hasReachedOwnedOrganizationLimit([
        ...nineOwned,
        ...Array.from({ length: 100 }, () => ({ role: "admin" })),
      ]),
    ).toBe(false);
  });
});

describe("account deletion ownership policy", () => {
  test("deletes every solely owned workspace with the account", () => {
    const plan = classifyAccountDeletionWorkspaces([
      { id: "personal", name: "Personal", slug: "personal", memberCount: 1 },
      { id: "solo", name: "Solo", slug: "solo", memberCount: 1 },
    ]);
    expect(plan.canDeleteAccount).toBe(true);
    expect(plan.deletableWorkspaces.map((workspace) => workspace.id)).toEqual([
      "personal",
      "solo",
    ]);
    expect(plan.blockedWorkspaces).toEqual([]);
  });

  test("blocks account deletion until shared ownership is transferred", () => {
    const plan = classifyAccountDeletionWorkspaces([
      { id: "personal", name: "Personal", slug: "personal", memberCount: 1 },
      { id: "team", name: "Team", slug: "team", memberCount: 3 },
    ]);
    expect(plan.canDeleteAccount).toBe(false);
    expect(plan.deletableWorkspaces.map((workspace) => workspace.id)).toEqual([
      "personal",
    ]);
    expect(plan.blockedWorkspaces.map((workspace) => workspace.id)).toEqual([
      "team",
    ]);
  });
});
