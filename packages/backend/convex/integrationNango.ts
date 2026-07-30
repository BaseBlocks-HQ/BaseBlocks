import type { IntegrationProviderKey } from "@baseblocks/domain";

const DEFAULT_NANGO_API_BASE_URL = "https://api.nango.dev";

export interface NangoRecordMetadata {
  cursor?: string;
  deleted_at?: string | null;
  last_action?: string;
}

export interface NangoContentMetadataRecord {
  id: string;
  object_type: string;
  title?: string;
  created_time?: string;
  last_edited_time?: string;
  parent_id?: string;
  url?: string;
  _nango_metadata?: NangoRecordMetadata;
}

export function normalizeNangoContentResource(
  record: NangoContentMetadataRecord,
) {
  return {
    externalId: record.id,
    resourceType: record.object_type,
    title: record.title?.trim() || "Untitled",
    url: record.url,
    parentExternalId: record.parent_id,
    providerCreatedAt: record.created_time,
    providerUpdatedAt: record.last_edited_time,
    deleted:
      Boolean(record._nango_metadata?.deleted_at) ||
      record._nango_metadata?.last_action === "DELETED",
  };
}

export function getNangoIntegrationId(
  provider: IntegrationProviderKey,
): string {
  if (provider === "notion") {
    return process.env.NANGO_NOTION_INTEGRATION_ID?.trim() || "notion";
  }
  throw new Error(`Provider is not available yet: ${provider}`);
}

function getNangoConfig() {
  const apiKey = process.env.NANGO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("NANGO_API_KEY is not configured");
  }

  return {
    apiKey,
    baseUrl:
      process.env.NANGO_API_BASE_URL?.trim().replace(/\/+$/, "") ||
      DEFAULT_NANGO_API_BASE_URL,
  };
}

export async function nangoRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { apiKey, baseUrl } = getNangoConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Nango request failed (${response.status}): ${body.slice(0, 500)}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function toPublicIntegrationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.includes("NANGO_API_KEY")) {
    return "The integration service is not configured.";
  }
  return "The integration service could not complete the request.";
}
