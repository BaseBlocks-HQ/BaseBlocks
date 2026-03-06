/**
 * Entity Storage client for file uploads
 *
 * Upload flow:
 * 1. POST /fs/upload with Bearer token -> { blobId }
 * 2. Commit to Convex with blobId reference
 *
 * Uses a same-origin proxy (/api/storage/*) to avoid CORS issues with corporate firewalls
 */

export interface UploadResult {
  blobId: string;
  cdnUrl: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class EntityStorageClient {
  private siteUrl: string;
  private workspaceTenantId: string;

  constructor(siteUrl: string, workspaceTenantId: string) {
    this.siteUrl = siteUrl;
    this.workspaceTenantId = workspaceTenantId;
  }

  /**
   * Upload a file to Entity Storage
   * Returns blobId and CDN URL for the file
   * Uses same-origin proxy which handles auth via session cookie
   */
  async upload(
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const blobId = response.blobId;

            const commitResponse = await fetch("/api/storage/commit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ blobId, path }),
            });

            if (!commitResponse.ok) {
              const commitError = await commitResponse.json().catch(() => ({}));
              reject(
                new Error(
                  commitError.error ||
                    `Commit failed: ${commitResponse.status}`,
                ),
              );
              return;
            }

            // Use proxy download endpoint to bypass corporate firewall CORS blocking
            const cdnUrl = `/api/storage/download?path=${encodeURIComponent(path)}`;
            resolve({
              blobId,
              cdnUrl,
            });
          } catch (err) {
            reject(
              err instanceof Error
                ? err
                : new Error("Invalid response from storage server"),
            );
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(
              new Error(
                error.message || error.error || `Upload failed: ${xhr.status}`,
              ),
            );
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      xhr.open("POST", "/api/storage/upload");
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      // Send raw file bytes, not FormData - ConvexFS streams body directly to storage
      xhr.send(file);
    });
  }

  /**
   * Generate a storage path for a document
   */
  generatePath(siteId: string, userId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `/${this.workspaceTenantId}/documents/${siteId}/${userId}/${timestamp}_${sanitizedFilename}`;
  }

  /**
   * Get the download URL for a blob
   */
  getDownloadUrl(blobId: string): string {
    return `${this.siteUrl}/fs/blobs/${blobId}`;
  }
}

// Environment configuration
const ENTITY_STORAGE_SITE_URL =
  process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL ?? "";
const WORKSPACE_TENANT_ID =
  process.env.NEXT_PUBLIC_ENTITY_AUTH_WORKSPACE_TENANT_ID ?? "";

// Singleton client instance
export const entityStorageClient = new EntityStorageClient(
  ENTITY_STORAGE_SITE_URL,
  WORKSPACE_TENANT_ID,
);

/**
 * Convert a storage URL to use the proxy endpoint
 * This handles both old direct Convex URLs and new proxy URLs
 * Use this for all downloads to bypass corporate firewall CORS blocking
 */
export function toProxyDownloadUrl(cdnUrl: string): string {
  // Already a proxy URL
  if (cdnUrl.startsWith("/api/storage/download")) {
    return cdnUrl;
  }

  // Extract path from Convex URL: https://xxx.convex.site/fs/download?path=...
  try {
    const url = new URL(cdnUrl);
    const path = url.searchParams.get("path");
    if (path) {
      return `/api/storage/download?path=${encodeURIComponent(path)}`;
    }
  } catch {
    // Not a valid URL, return as-is
  }

  return cdnUrl;
}
