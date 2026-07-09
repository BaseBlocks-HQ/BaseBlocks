import { getToken } from "@/app/_auth/server";
import { getServerConvexClient } from "@/app/_convex/server";
import { parseFileKey } from "@baseblocks/domain";
import { getFiles, getFilesMaxUploadSize } from "@/app/_storage/server";
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

      const canUpload = await getServerConvexClient(token).query(
        api.files.canUploadToSite,
        {
          siteId: parsed.siteId as never,
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
