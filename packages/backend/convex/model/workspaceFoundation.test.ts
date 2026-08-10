import { describe, expect, test } from "bun:test";
import {
  classifyWorkspaceIntent,
  guestPermissionAllows,
  normalizeGuestEmail,
  parseWorkspaceCreationHint,
  resolveGuestPagePermissions,
  strongestGuestPermission,
} from "./workspaceFoundation";

describe("workspace intent migration", () => {
  test("classifies exactly one member as personal", () => {
    expect(classifyWorkspaceIntent(1)).toBe("personal");
  });

  test("classifies two or more members as work", () => {
    expect(classifyWorkspaceIntent(2)).toBe("work");
    expect(classifyWorkspaceIntent(25)).toBe("work");
  });

  test("fails closed for orphaned or invalid member counts", () => {
    expect(classifyWorkspaceIntent(0)).toBeNull();
    expect(classifyWorkspaceIntent(-1)).toBeNull();
    expect(classifyWorkspaceIntent(1.5)).toBeNull();
  });

  test("accepts only namespaced creation hints", () => {
    expect(
      parseWorkspaceCreationHint({
        baseblocks: { intent: "personal", source: "onboarding" },
      }),
    ).toEqual({ intent: "personal", source: "onboarding" });
    expect(parseWorkspaceCreationHint({ intent: "personal" })).toBeNull();
    expect(
      parseWorkspaceCreationHint(
        JSON.stringify({
          baseblocks: { intent: "personal", source: "lazyPersonal" },
        }),
      ),
    ).toEqual({ intent: "personal", source: "lazyPersonal" });
    expect(
      parseWorkspaceCreationHint({
        baseblocks: { intent: "work", source: "migration" },
      }),
    ).toBeNull();
  });
});

describe("page guest model", () => {
  test("normalizes invitation email addresses", () => {
    expect(normalizeGuestEmail("  PERSON@Example.COM ")).toBe(
      "person@example.com",
    );
  });

  test("selects the strongest active permission", () => {
    expect(strongestGuestPermission([])).toBeNull();
    expect(strongestGuestPermission(["viewer"])).toBe("viewer");
    expect(strongestGuestPermission(["viewer", "editor"])).toBe("editor");
  });

  test("enforces viewer and editor capabilities", () => {
    expect(guestPermissionAllows("viewer", "viewer")).toBeTrue();
    expect(guestPermissionAllows("viewer", "editor")).toBeFalse();
    expect(guestPermissionAllows("editor", "viewer")).toBeTrue();
    expect(guestPermissionAllows("editor", "editor")).toBeTrue();
    expect(guestPermissionAllows(null, "viewer")).toBeFalse();
  });

  test("inherits grants down descendants without exposing parents or siblings", () => {
    const permissions = resolveGuestPagePermissions({
      pages: [
        { id: "parent" },
        { id: "root", parentId: "parent" },
        { id: "child", parentId: "root" },
        { id: "sibling", parentId: "parent" },
      ],
      grants: [{ pageId: "root", permission: "viewer", active: true }],
    });
    expect([...permissions.entries()]).toEqual([
      ["root", "viewer"],
      ["child", "viewer"],
    ]);
  });

  test("deduplicates overlapping grants and keeps the strongest permission", () => {
    const permissions = resolveGuestPagePermissions({
      pages: [{ id: "root" }, { id: "child", parentId: "root" }],
      grants: [
        { pageId: "root", permission: "viewer", active: true },
        { pageId: "child", permission: "editor", active: true },
        { pageId: "root", permission: "editor", active: false },
      ],
    });
    expect(permissions.get("root")).toBe("viewer");
    expect(permissions.get("child")).toBe("editor");
  });
});
