import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, normalize } from "node:path";

type Asset = {
  _id: string;
  checksum?: string;
  objectKey: string;
  size: number;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function safeObjectPath(root: string, objectKey: string): string {
  const relative = normalize(objectKey).replace(/^[/\\]+/, "");
  if (
    relative === ".." ||
    relative.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
  )
    throw new Error(`Unsafe object key: ${objectKey}`);
  return join(root, relative);
}

const [snapshotPath, outputRoot] = process.argv.slice(2);
if (!snapshotPath || !outputRoot)
  throw new Error(
    "Usage: backup-railway-objects.ts <snapshot.zip> <output-root>",
  );

const temporary = await mkdtemp(join(tmpdir(), "baseblocks-backup-"));
try {
  const unzip = Bun.spawnSync([
    "unzip",
    "-q",
    snapshotPath,
    "assets/documents.jsonl",
    "-d",
    temporary,
  ]);
  if (unzip.exitCode !== 0) throw new Error(unzip.stderr.toString());
  const assets = (
    await readFile(join(temporary, "assets/documents.jsonl"), "utf8")
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Asset);
  const client = new S3Client({
    endpoint: required("FILES_ENDPOINT"),
    region: required("FILES_REGION"),
    forcePathStyle: required("FILES_FORCE_PATH_STYLE") === "true",
    credentials: {
      accessKeyId: required("FILES_ACCESS_KEY_ID"),
      secretAccessKey: required("FILES_SECRET_ACCESS_KEY"),
    },
  });
  const bucket = required("FILES_BUCKET");
  const objectRoot = join(outputRoot, "objects");
  const manifest: Array<{
    assetId: string;
    checksum: string;
    checksumAlgorithm: "md5" | "sha256";
    objectKey: string;
    size: number;
  }> = [];
  let bytes = 0;
  for (const asset of assets) {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
    );
    if (!response.Body) throw new Error(`Missing body for ${asset.objectKey}`);
    const body = await response.Body.transformToByteArray();
    if (body.byteLength !== asset.size)
      throw new Error(`Size mismatch for ${asset.objectKey}`);
    const checksumAlgorithm = asset.checksum?.length === 32 ? "md5" : "sha256";
    const checksum = createHash(checksumAlgorithm).update(body).digest("hex");
    if (asset.checksum && checksum !== asset.checksum)
      throw new Error(`Checksum mismatch for ${asset.objectKey}`);
    const destination = safeObjectPath(objectRoot, asset.objectKey);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, body);
    manifest.push({
      assetId: asset._id,
      checksum,
      checksumAlgorithm,
      objectKey: asset.objectKey,
      size: asset.size,
    });
    bytes += asset.size;
  }
  await mkdir(objectRoot, { recursive: true });
  await writeFile(
    join(objectRoot, "object-manifest.json"),
    `${JSON.stringify({ assets: manifest, bytes, failures: [] }, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ bucket, objects: manifest.length, bytes, failures: [] }, null, 2)}\n`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
