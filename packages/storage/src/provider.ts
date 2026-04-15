export interface SignedUpload {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface StorageObjectMetadata {
  size: number;
  contentType: string;
  etag: string;
}

export interface StorageProvider {
  readonly driver: string;
  readonly provider: string;
  readonly bucket: string;

  signUpload(args: {
    objectKey: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<SignedUpload>;
  createSignedDownloadUrl(args: {
    bucket?: string;
    objectKey: string;
    filename?: string;
    download?: boolean;
    expiresInSeconds?: number;
  }): Promise<string>;
  readObjectBytes(args: {
    bucket?: string;
    objectKey: string;
  }): Promise<Uint8Array>;
  deleteObject(args: { bucket?: string; objectKey: string }): Promise<void>;
  headObject(args: {
    bucket?: string;
    objectKey: string;
  }): Promise<StorageObjectMetadata | null>;
}
