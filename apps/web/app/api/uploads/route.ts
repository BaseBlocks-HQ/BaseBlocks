import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import {
  deleteObject,
  getFiles,
  getMaxUploadSize,
  headObject,
} from "@/lib/files/server";
import { api } from "@baseblocks/backend";
import {
  createFileKey,
  isSupportedUploadMimeType,
  resolveUploadMimeType,
  type UploadPurpose,
} from "@baseblocks/domain";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";

const uploadRequest = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("sign"),
    siteId: z.string().min(1),
    purpose: z.enum(["document", "siteAsset"]),
    filename: z.string().min(1).max(255),
    contentType: z.string().max(255),
    size: z.number().int().nonnegative(),
  }),
  z.object({
    action: z.literal("complete"),
    siteId: z.string().min(1),
    purpose: z.enum(["document", "siteAsset"]),
    objectKey: z.string().min(1),
    filename: z.string().min(1).max(255),
    contentType: z.string().max(255),
    size: z.number().int().nonnegative(),
    uploadToken: z.string().min(1),
  }),
]);

function uploadToken(payload: string): string {
  const secret = process.env.FILES_API_SECRET?.trim();
  if (!secret) throw new Error("Missing FILES_API_SECRET");
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function tokenPayload(input: {
  siteId: string;
  purpose: UploadPurpose;
  objectKey: string;
  filename: string;
  contentType: string;
  size: number;
}): string {
  return JSON.stringify([
    input.siteId,
    input.purpose,
    input.objectKey,
    input.filename,
    input.contentType,
    input.size,
  ]);
}

async function authorize(siteId: string, purpose: UploadPurpose) {
  const token = await getToken();
  if (!token) return null;
  const allowed = await getServerConvexClient(token).query(
    api.files.canUploadToSite,
    { siteId: siteId as never, purpose },
  );
  return allowed ? token : null;
}

export async function POST(request: Request) {
  const parsed = uploadRequest.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload request" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (!(await authorize(input.siteId, input.purpose))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const maxSize = getMaxUploadSize();
  const contentType = resolveUploadMimeType(input);
  if (!isSupportedUploadMimeType(contentType)) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 415 },
    );
  }
  if (input.size > maxSize) {
    return NextResponse.json({ error: "File is too large" }, { status: 413 });
  }

  if (input.action === "sign") {
    const objectKey = createFileKey({
      siteId: input.siteId,
      purpose: input.purpose,
      fileId: crypto.randomUUID(),
      filename: input.filename,
    });
    const target = await getFiles().signedUploadUrl(objectKey, {
      contentType,
      expiresIn: 10 * 60,
      minSize: input.size,
      maxSize: input.size,
    });
    const token = uploadToken(
      tokenPayload({ ...input, objectKey, contentType }),
    );
    return NextResponse.json({
      objectKey,
      contentType,
      target,
      uploadToken: token,
    });
  }

  const expectedPrefix = createFileKey({
    siteId: input.siteId,
    purpose: input.purpose,
    fileId: "placeholder",
    filename: input.filename,
  })
    .split("/")
    .slice(0, 3)
    .join("/");
  if (!input.objectKey.startsWith(`${expectedPrefix}/`)) {
    return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
  }
  const expectedToken = uploadToken(tokenPayload({ ...input, contentType }));
  const suppliedToken = Buffer.from(input.uploadToken, "utf8");
  const validToken = Buffer.from(expectedToken, "utf8");
  if (
    suppliedToken.length !== validToken.length ||
    !timingSafeEqual(suppliedToken, validToken)
  ) {
    return NextResponse.json(
      { error: "Invalid upload token" },
      { status: 403 },
    );
  }

  const stored = await headObject(input.objectKey);
  if (stored.size !== input.size || stored.size > maxSize) {
    return NextResponse.json(
      { error: "Uploaded object size mismatch" },
      { status: 409 },
    );
  }
  const storedType = resolveUploadMimeType({
    filename: input.filename,
    contentType: stored.type || contentType,
  });
  if (storedType !== contentType) {
    return NextResponse.json(
      { error: "Uploaded object type mismatch" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    objectKey: stored.key,
    filename: input.filename,
    contentType: storedType,
    size: stored.size,
    checksum: stored.etag ?? undefined,
  });
}

const cleanupRequest = z.object({
  siteId: z.string().min(1),
  purpose: z.enum(["document", "siteAsset"]),
  objectKey: z.string().min(1),
});

export async function DELETE(request: Request) {
  const parsed = cleanupRequest.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid cleanup request" },
      { status: 400 },
    );
  }
  const input = parsed.data;
  if (!(await authorize(input.siteId, input.purpose))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  const keyPrefix = `sites/${input.siteId}/${input.purpose === "document" ? "documents" : "assets"}/`;
  if (!input.objectKey.startsWith(keyPrefix)) {
    return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
  }
  await deleteObject(input.objectKey);
  return new NextResponse(null, { status: 204 });
}
