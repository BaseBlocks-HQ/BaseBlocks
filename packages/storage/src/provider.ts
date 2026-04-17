export interface StorageObjectMetadata {
  size: number;
  contentType: string;
  etag: string;
}

export interface StorageProvider {
  readonly driver: string;
  readonly provider: string;
  readonly bucket: string;

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
  streamObject(args: {
    bucket?: string;
    objectKey: string;
    contentType: string;
    body: ReadableStream<Uint8Array>;
    contentLength?: number;
  }): Promise<void>;
  deleteObject(args: { bucket?: string; objectKey: string }): Promise<void>;
  headObject(args: {
    bucket?: string;
    objectKey: string;
  }): Promise<StorageObjectMetadata | null>;
}
