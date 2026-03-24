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

interface UploadIntent {
  objectKey: string;
  uploadUrl: string;
}

class StorageClient {
  private async createUploadIntent(
    file: File,
    options: {
      siteId: string;
      purpose: UploadPurpose;
    },
  ): Promise<UploadIntent> {
    const response = await fetch("/api/storage/upload", {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": `${file.size}`,
        "X-Baseblocks-Site-Id": options.siteId,
        "X-Baseblocks-Upload-Purpose": options.purpose,
        "X-Baseblocks-Filename": file.name,
      },
    });

    const payload = (await response.json().catch(() => ({}))) as Partial<
      UploadIntent & { error: string }
    >;
    if (!response.ok || !payload.objectKey || !payload.uploadUrl) {
      throw new Error(payload.error || `Upload failed: ${response.status}`);
    }

    return {
      objectKey: payload.objectKey,
      uploadUrl: payload.uploadUrl,
    };
  }

  /**
   * After a direct PUT upload completes, call this to get server-verified
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
      this.createUploadIntent(file, options)
        .then(({ objectKey, uploadUrl }) => {
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
            if (xhr.status < 200 || xhr.status >= 300) {
              reject(new Error(`Upload failed: ${xhr.status}`));
              return;
            }

            resolve({
              objectKey,
              size: file.size,
            });
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.addEventListener("abort", () => {
            reject(new Error("Upload cancelled"));
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader(
            "Content-Type",
            file.type || "application/octet-stream",
          );
          xhr.send(file);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

export const storageClient = new StorageClient();
