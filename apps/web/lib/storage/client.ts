/**
 * Entity Storage client for file uploads
 *
 * Upload flow:
 * 1. POST /fs/upload with Bearer token -> { blobId }
 * 2. Commit to Convex with blobId reference
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
   */
  async upload(
    file: File,
    path: string,
    accessToken: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> {
    // Create FormData with the file
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

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

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              blobId: response.blobId,
              cdnUrl: response.cdnUrl || `${this.siteUrl}/fs/${response.blobId}`,
            });
          } catch {
            reject(new Error("Invalid response from storage server"));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || error.error || `Upload failed: ${xhr.status}`));
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

      xhr.open("POST", `${this.siteUrl}/fs/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.send(formData);
    });
  }

  /**
   * Generate a storage path for a document
   */
  generatePath(
    siteId: string,
    userId: string,
    filename: string,
  ): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `/${this.workspaceTenantId}/documents/${siteId}/${userId}/${timestamp}_${sanitizedFilename}`;
  }

  /**
   * Get the download URL for a blob
   */
  getDownloadUrl(blobId: string): string {
    return `${this.siteUrl}/fs/${blobId}`;
  }
}

// Environment configuration
const ENTITY_STORAGE_SITE_URL =
  process.env.NEXT_PUBLIC_ENTITY_STORAGE_SITE_URL ||
  "https://gregarious-koala-319.convex.site";
const WORKSPACE_TENANT_ID =
  process.env.NEXT_PUBLIC_ENTITY_AUTH_WORKSPACE_TENANT_ID ||
  "baseblocks-232733";

// Singleton client instance
export const entityStorageClient = new EntityStorageClient(
  ENTITY_STORAGE_SITE_URL,
  WORKSPACE_TENANT_ID,
);
