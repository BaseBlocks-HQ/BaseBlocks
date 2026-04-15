import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageConfig } from "./config";
import { toAttachmentContentDisposition } from "./object-key";
import type { StorageObjectMetadata, StorageProvider } from "./provider";

export class S3CompatibleStorageProvider implements StorageProvider {
  readonly driver = "s3-compatible";
  readonly provider: string;
  readonly bucket: string;
  readonly #client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.provider = config.provider;
    this.bucket = config.bucket;
    this.#client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async createSignedDownloadUrl(args: {
    bucket?: string;
    objectKey: string;
    filename?: string;
    download?: boolean;
    expiresInSeconds?: number;
  }): Promise<string> {
    const contentDisposition =
      args.filename && args.download
        ? toAttachmentContentDisposition(args.filename)
        : undefined;

    return await getSignedUrl(
      this.#client,
      new GetObjectCommand({
        Bucket: args.bucket ?? this.bucket,
        Key: args.objectKey,
        ResponseContentDisposition: contentDisposition,
      }),
      { expiresIn: args.expiresInSeconds ?? 60 * 15 },
    );
  }

  async readObjectBytes(args: {
    bucket?: string;
    objectKey: string;
  }): Promise<Uint8Array> {
    const response = await this.#client.send(
      new GetObjectCommand({
        Bucket: args.bucket ?? this.bucket,
        Key: args.objectKey,
      }),
    );

    if (!response.Body) {
      throw new Error(`Missing object body for ${args.objectKey}`);
    }

    return await response.Body.transformToByteArray();
  }

  async streamObject(args: {
    bucket?: string;
    objectKey: string;
    contentType: string;
    body: ReadableStream<Uint8Array>;
    contentLength?: number;
  }): Promise<void> {
    const nodeStream = Readable.fromWeb(
      args.body as unknown as import("stream/web").ReadableStream,
    );

    await this.#client.send(
      new PutObjectCommand({
        Bucket: args.bucket ?? this.bucket,
        Key: args.objectKey,
        ContentType: args.contentType,
        ContentLength: args.contentLength,
        Body: nodeStream,
      }),
    );
  }

  async deleteObject(args: {
    bucket?: string;
    objectKey: string;
  }): Promise<void> {
    await this.#client.send(
      new DeleteObjectCommand({
        Bucket: args.bucket ?? this.bucket,
        Key: args.objectKey,
      }),
    );
  }

  async headObject(args: {
    bucket?: string;
    objectKey: string;
  }): Promise<StorageObjectMetadata | null> {
    try {
      const response = await this.#client.send(
        new HeadObjectCommand({
          Bucket: args.bucket ?? this.bucket,
          Key: args.objectKey,
        }),
      );

      return {
        size: response.ContentLength ?? 0,
        contentType: response.ContentType ?? "application/octet-stream",
        etag: response.ETag?.replace(/"/g, "") ?? "",
      };
    } catch {
      return null;
    }
  }
}
