"use client";

import type { UploadPurpose } from "@baseblocks/domain";
import type { SignedUpload } from "files-sdk";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  objectKey: string;
  size: number;
  contentType: string;
  checksum: string;
}

export interface FileRegistration {
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
  checksum: string;
}

interface UploadOptions {
  siteId: string;
  purpose: UploadPurpose;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

export function fileRegistration(
  file: File,
  uploaded: UploadResult,
): FileRegistration {
  return {
    objectKey: uploaded.objectKey,
    filename: file.name,
    contentType: uploaded.contentType,
    size: uploaded.size,
    checksum: uploaded.checksum,
  };
}

function sendSignedUpload(
  target: SignedUpload,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal,
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
    if (signal?.aborted) {
      xhr.abort();
      return;
    }
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

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

async function uploadRequest<T>(
  body: object,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
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
  options: UploadOptions,
): Promise<UploadResult> {
  const signed = await uploadRequest<{
    objectKey: string;
    contentType: string;
    target: SignedUpload;
    uploadToken: string;
  }>(
    {
      action: "sign",
      siteId: options.siteId,
      purpose: options.purpose,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    },
    options.signal,
  );
  await sendSignedUpload(
    signed.target,
    file,
    options.onProgress,
    options.signal,
  );
  let uploaded: UploadResult;
  try {
    uploaded = await uploadRequest<UploadResult>(
      {
        action: "complete",
        siteId: options.siteId,
        purpose: options.purpose,
        objectKey: signed.objectKey,
        filename: file.name,
        contentType: signed.contentType,
        size: file.size,
        uploadToken: signed.uploadToken,
      },
      options.signal,
    );
  } catch (completionError) {
    return await cleanupAfterFailure(
      completionError,
      {
        siteId: options.siteId,
        purpose: options.purpose,
        objectKey: signed.objectKey,
      },
      "Upload verification failed and the uploaded object could not be cleaned up",
    );
  }
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

async function cleanupAfterFailure(
  failure: unknown,
  options: { siteId: string; purpose: UploadPurpose; objectKey: string },
  cleanupFailureMessage: string,
): Promise<never> {
  try {
    await cleanup(options);
  } catch (cleanupError) {
    throw new AggregateError([failure, cleanupError], cleanupFailureMessage);
  }
  throw failure;
}

async function uploadAndRegister<T>(
  file: File,
  options: UploadOptions,
  register: (uploaded: UploadResult) => Promise<T>,
): Promise<{ registered: T; uploaded: UploadResult }> {
  const uploaded = await uploadObject(file, options);

  try {
    return { registered: await register(uploaded), uploaded };
  } catch (registrationError) {
    return await cleanupAfterFailure(
      registrationError,
      {
        siteId: options.siteId,
        purpose: options.purpose,
        objectKey: uploaded.objectKey,
      },
      "Upload registration failed and the uploaded object could not be cleaned up",
    );
  }
}

export const filesClient = {
  uploadAndRegister,
};
