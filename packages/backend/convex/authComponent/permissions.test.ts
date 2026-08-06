import { describe, expect, test } from "bun:test";
import { roleHasPermission } from "./permissions";

describe("organization lifecycle permissions", () => {
  test("only owners can delete an organization", () => {
    expect(
      roleHasPermission("owner", {
        resource: "organization",
        action: "delete",
      }),
    ).toBe(true);
    for (const role of ["admin", "editor", "viewer"]) {
      expect(
        roleHasPermission(role, {
          resource: "organization",
          action: "delete",
        }),
      ).toBe(false);
    }
  });

  test("owners and admins can rename an organization", () => {
    for (const role of ["owner", "admin"]) {
      expect(
        roleHasPermission(role, {
          resource: "organization",
          action: "update",
        }),
      ).toBe(true);
    }
    for (const role of ["editor", "viewer"]) {
      expect(
        roleHasPermission(role, {
          resource: "organization",
          action: "update",
        }),
      ).toBe(false);
    }
  });

  test("combined Better Auth roles preserve the strongest capability", () => {
    expect(
      roleHasPermission("viewer,owner", {
        resource: "organization",
        action: "delete",
      }),
    ).toBe(true);
  });
});
