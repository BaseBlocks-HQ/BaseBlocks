import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

type ManifestAsset = {
  assetId: string;
  checksum: string;
  checksumAlgorithm: "md5" | "sha256";
  objectKey: string;
  size: number;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function loadEnv(path: string) {
  const contents = await readFile(path, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const [backupRoot, bucket] = process.argv.slice(2);
if (!backupRoot || !bucket) {
  throw new Error("Usage: rehearsal-storage.ts <extracted-backup-root> <bucket>");
}

await loadEnv(join(import.meta.dir, "../../apps/web/.env.local"));
const client = new S3Client({
  endpoint: required("FILES_ENDPOINT"),
  region: required("FILES_REGION"),
  forcePathStyle: (process.env.FILES_FORCE_PATH_STYLE ?? "true") === "true",
  credentials: {
    accessKeyId: required("FILES_ACCESS_KEY_ID"),
    secretAccessKey: required("FILES_SECRET_ACCESS_KEY"),
  },
});

try {
  await client.send(new HeadBucketCommand({ Bucket: bucket }));
} catch {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
}

const manifest = JSON.parse(
  await readFile(join(backupRoot, "objects/object-manifest.json"), "utf8"),
) as { assets: ManifestAsset[] };
const failures: Array<{ objectKey: string; reason: string }> = [];
let bytes = 0;

for (const asset of manifest.assets) {
  const body = await readFile(join(backupRoot, "objects", asset.objectKey));
  const digest = createHash(asset.checksumAlgorithm).update(body).digest("hex");
  if (body.byteLength !== asset.size || digest !== asset.checksum) {
    failures.push({ objectKey: asset.objectKey, reason: "archive mismatch" });
    continue;
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: asset.objectKey,
      Body: body,
      Metadata: {
        "baseblocks-checksum": asset.checksum,
        "baseblocks-checksum-algorithm": asset.checksumAlgorithm,
      },
    }),
  );
  const head = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
  );
  if (
    head.ContentLength !== asset.size ||
    head.Metadata?.["baseblocks-checksum"] !== asset.checksum
  ) {
    failures.push({ objectKey: asset.objectKey, reason: "remote mismatch" });
    continue;
  }
  const remote = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
  );
  if (!remote.Body) {
    failures.push({ objectKey: asset.objectKey, reason: "empty remote body" });
    continue;
  }
  const remoteBody = await remote.Body.transformToByteArray();
  const remoteDigest = createHash(asset.checksumAlgorithm)
    .update(remoteBody)
    .digest("hex");
  if (remoteBody.byteLength !== asset.size || remoteDigest !== asset.checksum) {
    failures.push({ objectKey: asset.objectKey, reason: "remote checksum mismatch" });
    continue;
  }
  bytes += asset.size;
}

const listed = new Map<string, number>();
let continuationToken: string | undefined;
do {
  const page = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }),
  );
  for (const object of page.Contents ?? []) {
    if (object.Key) listed.set(object.Key, object.Size ?? -1);
  }
  continuationToken = page.IsTruncated
    ? page.NextContinuationToken
    : undefined;
} while (continuationToken);

const expectedKeys = new Set(manifest.assets.map((asset) => asset.objectKey));
for (const asset of manifest.assets) {
  const listedSize = listed.get(asset.objectKey);
  if (listedSize === undefined)
    failures.push({ objectKey: asset.objectKey, reason: "missing from listing" });
  else if (listedSize !== asset.size)
    failures.push({ objectKey: asset.objectKey, reason: "listed size mismatch" });
}
for (const key of listed.keys()) {
  if (!expectedKeys.has(key))
    failures.push({ objectKey: key, reason: "unexpected listed object" });
}

const result = {
  bucket,
  expectedObjects: manifest.assets.length,
  verifiedObjects: manifest.assets.length - failures.length,
  verifiedBytes: bytes,
  listedObjects: listed.size,
  listedBytes: [...listed.values()].reduce((total, size) => total + size, 0),
  failures,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
