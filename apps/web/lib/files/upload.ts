"use client";

import type { UploadPurpose } from "@baseblocks/domain";
import type { SignedUpload } from "files-sdk";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  objectKey: string;
  size: number;
  contentType: string;
  checksum: string;
}

function sendSignedUpload(
  target: SignedUpload,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(target.method, target.url, true);

    if (target.method === "PUT") {
      for (const [key, value] of Object.entries(target.headers ?? {})) {
        xhr.setRequestHeader(key, value);
      }
    }

    xhr.upload.addEventListener("progress", (event) => {
      const total = event.lengthComputable ? event.total : file.size;
      onProgress?.({
        loaded: event.loaded,
        total,
        percentage: total > 0 ? Math.round((event.loaded / total) * 100) : 0,
      });
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    if (target.method === "POST") {
      const form = new FormData();
      for (const [key, value] of Object.entries(target.fields)) {
        form.append(key, value);
      }
      form.append("file", file);
      xhr.send(form);
      return;
    }

    xhr.send(file);
  });
}

async function uploadRequest<T>(body: object): Promise<T> {
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok)
    throw new Error(result?.error || `Upload failed (${response.status})`);
  return result as T;
}

async function uploadObject(
  file: File,
  options: {
    siteId: string;
    purpose: UploadPurpose;
    onProgress?: (progress: UploadProgress) => void;
  },
): Promise<UploadResult> {
  const signed = await uploadRequest<{
    objectKey: string;
    contentType: string;
    target: SignedUpload;
    uploadToken: string;
  }>({
    action: "sign",
    siteId: options.siteId,
    purpose: options.purpose,
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });
  await sendSignedUpload(signed.target, file, options.onProgress);
  const uploaded = await uploadRequest<UploadResult>({
    action: "complete",
    siteId: options.siteId,
    purpose: options.purpose,
    objectKey: signed.objectKey,
    filename: file.name,
    contentType: signed.contentType,
    size: file.size,
    uploadToken: signed.uploadToken,
  });
  options.onProgress?.({
    loaded: uploaded.size,
    total: uploaded.size,
    percentage: 100,
  });
  return uploaded;
}

async function cleanup(options: {
  siteId: string;
  purpose: UploadPurpose;
  objectKey: string;
}): Promise<void> {
  const response = await fetch("/api/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      result?.error || `Upload cleanup failed (${response.status})`,
    );
  }
}

export const filesClient = { upload: uploadObject, cleanup };
