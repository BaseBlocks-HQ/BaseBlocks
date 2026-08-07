export type PageExportAsset = {
  fileId: string;
  filename: string;
  contentType: string;
  objectKey: string;
  size: number;
  checksum?: string;
};

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
