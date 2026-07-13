import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import {
  isSupportedUploadMimeType,
  parseFileKey,
  resolveUploadMimeType,
  toFilesKind,
  type UploadPurpose,
} from "@baseblocks/domain";
import { getFiles, getMaxUploadSize } from "@/lib/files/server";
import { api } from "@baseblocks/backend";
import { FilesError } from "files-sdk";
import { createFilesRouter, type FilesApi } from "files-sdk/api";

export const runtime = "nodejs";

let router: FilesApi | null = null;

function getRouter() {
  router ??= createFilesRouter({
    files: getFiles,
    operations: [
      "capabilities",
      "upload",
      "head",
      "delete",
      "url",
      "download",
      "signedUploadUrl",
    ],
    maxUploadSize: getMaxUploadSize(),
    secret: process.env.FILES_API_SECRET,
    authorize: async ({ operation, key, req }) => {
      if (operation === "capabilities") {
        return;
      }

      const parsed = key ? parseFileKey(key) : null;
      const scopedSiteId = req.headers.get("x-baseblocks-site-id");
      const scopedPurpose = req.headers.get("x-baseblocks-upload-purpose");
      const scopedFileId = req.headers.get("x-baseblocks-upload-file-id");
      const hasUploadScope =
        scopedSiteId &&
        (scopedPurpose === "file" || scopedPurpose === "siteAsset") &&
        scopedFileId &&
        !scopedSiteId.includes("/") &&
        !scopedFileId.includes("/");
      if (!parsed && !hasUploadScope) {
        throw new FilesError("Unauthorized", "Invalid file scope");
      }

      const siteId = parsed?.siteId ?? scopedSiteId;
      const purpose: UploadPurpose = parsed
        ? parsed.kind === "documents" || parsed.kind === "files"
          ? "file"
          : "siteAsset"
        : (scopedPurpose as UploadPurpose);

      if (operation === "upload") {
        const contentType = resolveUploadMimeType({
          filename:
            parsed?.filename ??
            req.headers.get("x-baseblocks-upload-filename") ??
            "upload",
          contentType:
            req.headers.get("x-baseblocks-upload-content-type") ??
            req.headers.get("content-type"),
        });
        if (!isSupportedUploadMimeType(contentType)) {
          throw new FilesError("Unauthorized", "File type not allowed");
        }
      }

      const token = await getToken();
      if (!token) {
        throw new FilesError("Unauthorized", "Not authenticated");
      }

      const canUpload = await getServerConvexClient(token).query(
        api.files.canUploadToSite,
        {
          siteId: siteId as never,
          purpose,
        },
      );
      if (!canUpload) {
        throw new FilesError("Unauthorized", "Not authorized");
      }

      return {
        disposition:
          operation === "download" || operation === "url"
            ? "inline"
            : undefined,
        maxExpiresIn: 60 * 60,
        keyPrefix: parsed
          ? undefined
          : `sites/${siteId}/${toFilesKind(purpose)}/${scopedFileId}/`,
      };
    },
  });
  return router;
}

export async function GET(request: Request) {
  return await getRouter().handle(request);
}

export async function POST(request: Request) {
  return await getRouter().handle(request);
}

export async function PUT(request: Request) {
  return await getRouter().handle(request);
}
