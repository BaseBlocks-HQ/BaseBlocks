import type { api } from "@baseblocks/backend";
import type { FunctionReturnType } from "convex/server";
import type { TreeNode } from "@baseblocks/domain";

export type LibraryExplorerPayload = NonNullable<
  FunctionReturnType<typeof api.libraries.getExplorer>
>;
export type LibraryFolder = LibraryExplorerPayload["folders"][number];
export type LibraryFile = LibraryExplorerPayload["files"][number];
export type FolderId = LibraryFolder["_id"];
export type DocumentId = LibraryFile["_id"];
export type LibraryId = LibraryExplorerPayload["library"]["_id"];
export type LibraryEntity =
  | { kind: "folder"; folder: LibraryFolder }
  | { kind: "file"; file: LibraryFile };
export type LibraryDialogTarget =
  | { kind: "folder"; id: FolderId; name: string }
  | { kind: "file"; id: DocumentId; name: string };

export function buildLibraryTreeInput(
  folders: LibraryFolder[],
  files: LibraryFile[],
) {
  const nodes: TreeNode<LibraryEntity>[] = [
    ...folders.map((folder) => ({
      id: folder._id,
      parentId: folder.parentId ?? null,
      label: folder.name,
      order: folder.order,
      data: { kind: "folder" as const, folder },
    })),
    ...files.map((file, index) => ({
      id: file._id,
      parentId: file.folderId ?? null,
      label: file.filename,
      order: Number.MAX_SAFE_INTEGER - files.length + index,
      data: { kind: "file" as const, file },
    })),
  ];
  return {
    nodes,
    entityById: new Map(nodes.map((node) => [node.id, node.data])),
    entityByFileId: new Map(
      nodes.flatMap((node) =>
        node.data.kind === "file"
          ? [[node.data.file._id, node.data] as const]
          : [],
      ),
    ),
  };
}
