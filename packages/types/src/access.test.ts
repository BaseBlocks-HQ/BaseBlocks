import { describe, expect, test } from "bun:test";
import { getTeamCapabilities, hasTeamCapability } from "./access";

describe("team access", () => {
  test("admin gets every capability", () => {
    const capabilities = getTeamCapabilities("admin");

    expect(capabilities.canEditContent).toBe(true);
    expect(capabilities.canManageLibraries).toBe(true);
    expect(capabilities.canManageSites).toBe(true);
    expect(capabilities.canManageTeam).toBe(true);
    expect(capabilities.canPublish).toBe(true);
  });

  test("editor gets content capabilities but not team management", () => {
    const capabilities = getTeamCapabilities("editor");

    expect(capabilities.canEditContent).toBe(true);
    expect(capabilities.canManageLibraries).toBe(true);
    expect(capabilities.canManageSites).toBe(true);
    expect(capabilities.canManageTeam).toBe(false);
    expect(capabilities.canPublish).toBe(true);
  });

  test("viewer remains read only", () => {
    expect(hasTeamCapability("viewer", "canEditContent")).toBe(false);
    expect(hasTeamCapability("viewer", "canManageLibraries")).toBe(false);
    expect(hasTeamCapability("viewer", "canManageSites")).toBe(false);
    expect(hasTeamCapability("viewer", "canManageTeam")).toBe(false);
    expect(hasTeamCapability("viewer", "canPublish")).toBe(false);
  });
});
