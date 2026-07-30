export const integrationProviderKeys = [
  "notion",
  "confluence",
  "googleDrive",
  "sharePoint",
  "github",
  "linear",
  "jira",
] as const;

export type IntegrationProviderKey = (typeof integrationProviderKeys)[number];

export type IntegrationProviderAvailability = "available" | "comingSoon";

export interface IntegrationProviderDefinition {
  key: IntegrationProviderKey;
  name: string;
  description: string;
  availability: IntegrationProviderAvailability;
  capabilities: readonly ("contentDiscovery" | "contentSync")[];
}

export const integrationProviders = [
  {
    key: "notion",
    name: "Notion",
    description: "Discover and keep shared Notion pages in sync.",
    availability: "available",
    capabilities: ["contentDiscovery", "contentSync"],
  },
  {
    key: "confluence",
    name: "Confluence",
    description: "Connect Confluence spaces and pages.",
    availability: "comingSoon",
    capabilities: ["contentDiscovery", "contentSync"],
  },
  {
    key: "googleDrive",
    name: "Google Drive",
    description: "Sync documents and files from shared drives.",
    availability: "comingSoon",
    capabilities: ["contentDiscovery", "contentSync"],
  },
  {
    key: "sharePoint",
    name: "SharePoint",
    description: "Bring Microsoft 365 sites and documents into BaseBlocks.",
    availability: "comingSoon",
    capabilities: ["contentDiscovery", "contentSync"],
  },
  {
    key: "github",
    name: "GitHub",
    description:
      "Connect repositories, issues, discussions, and documentation.",
    availability: "comingSoon",
    capabilities: ["contentDiscovery", "contentSync"],
  },
  {
    key: "linear",
    name: "Linear",
    description: "Sync projects, issues, and product planning context.",
    availability: "comingSoon",
    capabilities: ["contentDiscovery", "contentSync"],
  },
  {
    key: "jira",
    name: "Jira",
    description: "Connect projects, tickets, and delivery knowledge.",
    availability: "comingSoon",
    capabilities: ["contentDiscovery", "contentSync"],
  },
] as const satisfies readonly IntegrationProviderDefinition[];

export function isIntegrationProviderKey(
  value: string,
): value is IntegrationProviderKey {
  return integrationProviderKeys.includes(value as IntegrationProviderKey);
}

export function getIntegrationProvider(
  key: IntegrationProviderKey,
): IntegrationProviderDefinition {
  const provider = integrationProviders.find(
    (candidate) => candidate.key === key,
  );
  if (!provider) {
    throw new Error(`Unknown integration provider: ${key}`);
  }
  return provider;
}
