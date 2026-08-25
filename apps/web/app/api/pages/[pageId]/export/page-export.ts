export type PageExportAsset = {
  fileId: string;
  filename: string;
  contentType: string;
  objectKey: string;
  size: number;
  checksum?: string;
};

function startsWithBytes(data: Uint8Array, signature: readonly number[]) {
  return signature.every((byte, index) => data[index] === byte);
}

/** Identify the safe raster type from the stored bytes, not stale metadata. */
export function detectRasterMediaType(
  data: Uint8Array,
): "image/bmp" | "image/gif" | "image/jpeg" | "image/png" | undefined {
  if (startsWithBytes(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWithBytes(data, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWithBytes(data, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (startsWithBytes(data, [0x42, 0x4d])) return "image/bmp";
  return undefined;
}

export function isFatalExportWarning(code: string): boolean {
  return code === "asset_rejected" || code === "unsafe_url";
}

function normalizeEtag(value: string): string {
  return value.trim().replace(/^W\//u, "").replace(/^"|"$/gu, "");
}

export function assertStoredChecksum(
  expected: string | undefined,
  actualEtag: string | undefined,
): void {
  if (!expected || /^[a-f\d]{64}$/iu.test(expected)) return;
  if (!actualEtag || normalizeEtag(actualEtag) !== normalizeEtag(expected)) {
    throw new Error("Stored file checksum does not match its release snapshot");
  }
}
