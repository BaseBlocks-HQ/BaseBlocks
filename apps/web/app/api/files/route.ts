import { getToken } from "@/lib/auth/server";
import { canUploadToSite } from "@/lib/convex/server";
import { parseFileKey } from "@/lib/files/keys";
import { getFiles, getFilesMaxUploadSize } from "@/lib/files/server";
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
    maxUploadSize: getFilesMaxUploadSize() ?? undefined,
    secret: process.env.FILES_API_SECRET,
    authorize: async ({ operation, key }) => {
      if (operation === "capabilities") {
        return;
      }

      if (!key) {
        throw new FilesError("Unauthorized", "Missing file key");
      }

      const parsed = parseFileKey(key);
      if (!parsed) {
        throw new FilesError("Unauthorized", "Invalid file key");
      }

      const token = await getToken();
      if (!token) {
        throw new FilesError("Unauthorized", "Not authenticated");
      }

      const canUpload = await canUploadToSite(parsed.siteId, token);
      if (!canUpload) {
        throw new FilesError("Unauthorized", "Not authorized");
      }

      return {
        disposition:
          operation === "download" || operation === "url"
            ? "inline"
            : undefined,
        maxExpiresIn: 60 * 60,
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
