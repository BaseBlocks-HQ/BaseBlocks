import type { UploadPurpose } from "@baseblocks/types";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  objectKey: string;
  size: number;
}

interface AuthorizedUploadResult {
  objectKey: string;
  contentType: string;
  uploadUrl: string;
  uploadMethod: "PUT";
  uploadToken: string;
}

export interface FinalizeResult {
  objectKey: string;
  size: number;
  contentType: string;
  checksum: string;
}

class StorageClient {
  /**
   * After a direct upload completes, call this to get server-verified
   * metadata (size, contentType, etag/checksum).  Always pass the returned
   * values to Convex mutations instead of the client-side File properties.
   */
  async finalize(options: {
    siteId: string;
    purpose: UploadPurpose;
    objectKey: string;
  }): Promise<FinalizeResult> {
    const response = await fetch("/api/storage/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objectKey: options.objectKey,
        siteId: options.siteId,
        purpose: options.purpose,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<
      FinalizeResult & { error: string }
    >;
    if (!response.ok || !payload.objectKey) {
      throw new Error(payload.error || `Finalize failed: ${response.status}`);
    }

    return {
      objectKey: payload.objectKey,
      size: payload.size ?? 0,
      contentType: payload.contentType ?? "application/octet-stream",
      checksum: payload.checksum ?? "",
    };
  }

  async cleanup(options: {
    siteId: string;
    purpose: UploadPurpose;
    objectKey: string;
  }): Promise<void> {
    await fetch("/api/storage/upload", {
      method: "DELETE",
      headers: {
        "X-Baseblocks-Site-Id": options.siteId,
        "X-Baseblocks-Upload-Purpose": options.purpose,
        "X-Baseblocks-Object-Key": options.objectKey,
      },
    }).catch(() => undefined);
  }

  async upload(
    file: File,
    options: {
      siteId: string;
      purpose: UploadPurpose;
      onProgress?: (progress: UploadProgress) => void;
    },
  ): Promise<UploadResult> {
    const authorizeResponse = await fetch("/api/storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId: options.siteId,
        purpose: options.purpose,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      }),
    });

    const authorizePayload = (await authorizeResponse
      .json()
      .catch(() => ({}))) as Partial<
      AuthorizedUploadResult & { error: string }
    >;
    if (
      !authorizeResponse.ok ||
      !authorizePayload.objectKey ||
      !authorizePayload.uploadUrl ||
      !authorizePayload.uploadMethod ||
      !authorizePayload.uploadToken
    ) {
      throw new Error(
        authorizePayload.error ||
          `Upload authorization failed: ${authorizeResponse.status}`,
      );
    }

    const authorizedUpload: AuthorizedUploadResult = {
      objectKey: authorizePayload.objectKey,
      contentType: authorizePayload.contentType ?? "application/octet-stream",
      uploadUrl: authorizePayload.uploadUrl,
      uploadMethod: authorizePayload.uploadMethod,
      uploadToken: authorizePayload.uploadToken,
    };

    return await new Promise((resolve, reject) => {
      options.onProgress?.({
        loaded: 0,
        total: file.size,
        percentage: 0,
      });

      const xhr = new XMLHttpRequest();

      xhr.addEventListener("load", () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          try {
            const payload = JSON.parse(xhr.responseText) as { error?: string };
            reject(new Error(payload.error || `Upload failed: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
          return;
        }

        options.onProgress?.({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });

        resolve({
          objectKey: authorizedUpload.objectKey,
          size: file.size,
        });
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      xhr.open(authorizedUpload.uploadMethod, authorizedUpload.uploadUrl);
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      xhr.setRequestHeader(
        "X-Baseblocks-Upload-Ticket",
        authorizedUpload.uploadToken,
      );
      xhr.send(file);
    });
  }
}

export const storageClient = new StorageClient();
