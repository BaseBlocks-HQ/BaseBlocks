import { describe, expect, test } from "bun:test";
import {
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
