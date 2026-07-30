import { describe, expect, test } from "bun:test";
import {
  getIntegrationProvider,
  integrationProviders,
  isIntegrationProviderKey,
} from "./catalog";

describe("integration provider catalog", () => {
  test("exposes Notion as the first available provider", () => {
    expect(getIntegrationProvider("notion")).toMatchObject({
      availability: "available",
      capabilities: ["contentDiscovery", "contentSync"],
    });
  });

  test("keeps unavailable providers explicit", () => {
    const comingSoonProviders = integrationProviders.filter(
      ({ availability }) => availability === "comingSoon",
    );
    expect(comingSoonProviders).toHaveLength(6);
    expect(comingSoonProviders.map(({ key }) => key)).toContain("github");
  });

  test("validates provider keys without accepting arbitrary strings", () => {
    expect(isIntegrationProviderKey("notion")).toBe(true);
    expect(isIntegrationProviderKey("slack")).toBe(false);
    expect(isIntegrationProviderKey("unknown")).toBe(false);
  });
});
