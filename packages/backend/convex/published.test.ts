import { describe, expect, test } from "bun:test";
import { getPage } from "./published";

type RegisteredFunction = {
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
};

function invoke(fn: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  return (fn as RegisteredFunction)._handler(ctx, args);
}

describe("published page images", () => {
  test("returns only referenced image assets captured by the live release", async () => {
    const release = {
      _id: "release-1",
      siteId: "site-1",
      defaultPageId: "page-1",
    };
    const site = {
      _id: release.siteId,
      organizationId: "organization-1",
      liveReleaseId: release._id,
      visibility: "public",
    };
    const page = {
      _id: "release-page-1",
      releaseId: release._id,
      siteId: site._id,
      pageId: release.defaultPageId,
      title: "Home",
      slug: "home",
      parentId: undefined,
      icon: undefined,
      contentRevisionId: "revision-1",
      updatedAt: 100,
    };
    const revision = {
      _id: page.contentRevisionId,
      payloadId: "payload-1",
      fileIds: ["image-released", "file-not-image"],
      libraryIds: [],
      pageIds: [],
    };
    const payload = {
      _id: revision.payloadId,
      content: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "image",
            attrs: {
              "openeditor-id": "image-node-released",
              imageId: "image-released",
              src: null,
              alt: "Released",
            },
          },
          {
            type: "image",
            attrs: {
              "openeditor-id": "image-node-draft",
              imageId: "image-draft-only",
              src: null,
              alt: "Draft",
            },
          },
          {
            type: "image",
            attrs: {
              "openeditor-id": "image-node-wrong-kind",
              imageId: "file-not-image",
              src: null,
              alt: "Wrong kind",
            },
          },
        ],
      },
    };
    const releaseFiles = new Map([
      [
        "image-released",
        {
          releaseId: release._id,
          fileId: "image-released",
          kind: "siteAsset",
          contentType: "image/png",
        },
      ],
      [
        "file-not-image",
        {
          releaseId: release._id,
          fileId: "file-not-image",
          kind: "file",
          contentType: "text/plain",
        },
      ],
    ]);
    const records = new Map<string, unknown>([
      [release._id, release],
      [site._id, site],
      [revision._id, revision],
      [payload._id, payload],
    ]);
    const ctx = {
      db: {
        get: async (id: string) => records.get(id) ?? null,
        query: (table: string) => ({
          withIndex: (
            _index: string,
            build: (query: {
              eq: (field: string, value: string) => unknown;
            }) => unknown,
          ) => {
            let fileId: string | undefined;
            const query = {
              eq(field: string, value: string) {
                if (field === "fileId") fileId = value;
                return query;
              },
            };
            build(query);
            return {
              unique: async () =>
                table === "releasePages"
                  ? page
                  : fileId
                    ? (releaseFiles.get(fileId) ?? null)
                    : null,
            };
          },
        }),
      },
    };

    const result = (await invoke(getPage, ctx, {
      releaseId: release._id,
      path: "",
    })) as { imageIds?: string[] };

    expect(result.imageIds).toEqual(["image-released"]);
  });
});
