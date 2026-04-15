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

export interface FinalizeResult {
  objectKey: string;
  size: number;
  contentType: string;
  checksum: string;
}

class StorageClient {
  /**
   * After a same-origin upload completes, call this to get server-verified
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
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable || !options.onProgress) {
          return;
        }

        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      });

      xhr.addEventListener("load", () => {
        let payload: Partial<{
          objectKey: string;
          error: string;
        }> = {};
        try {
          payload = JSON.parse(xhr.responseText || "{}") as Partial<{
            objectKey: string;
            error: string;
          }>;
        } catch {}

        if (xhr.status < 200 || xhr.status >= 300 || !payload.objectKey) {
          reject(new Error(payload.error || `Upload failed: ${xhr.status}`));
          return;
        }

        resolve({
          objectKey: payload.objectKey,
          size: file.size,
        });
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      xhr.open("PUT", "/api/storage/upload");
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream",
      );
      xhr.setRequestHeader("X-Baseblocks-Site-Id", options.siteId);
      xhr.setRequestHeader("X-Baseblocks-Upload-Purpose", options.purpose);
      xhr.setRequestHeader("X-Baseblocks-Filename", file.name);
      xhr.setRequestHeader("X-Baseblocks-Upload-Size", `${file.size}`);
      xhr.send(file);
    });
  }
}

export const storageClient = new StorageClient();
