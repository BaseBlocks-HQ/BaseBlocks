"use client";

import { getStoredAccessSessionTokens } from "@/features/published-sites/access-session";
import { LibraryExplorer } from "@/features/libraries/components/library-explorer";
import type { LibraryId } from "@/features/libraries/tree-input";
import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { api } from "@baseblocks/backend";
import type { LibraryContent } from "@baseblocks/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Switch } from "@baseblocks/ui/switch";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  type OpenEditorNodeViewProps,
} from "@openeditor/react";
import { useQuery } from "convex/react";

function readLibrary(value: unknown): LibraryContent {
  const candidate =
    value && typeof value === "object" ? (value as LibraryContent) : {};
  return {
    libraryId: candidate.libraryId,
    allowDownloads: candidate.allowDownloads ?? true,
  };
}

function LibraryEditor({
  value,
  onChange,
}: {
  value: LibraryContent;
  onChange: (value: LibraryContent) => void;
}) {
  const { siteId } = useSiteRenderActions();
  const libraries = useQuery(
    api.libraries.listLibraries,
    siteId ? { siteId } : "skip",
  );
  const libraryId = value.libraryId as LibraryId | undefined;
  const explorer = useQuery(
    api.libraries.getExplorer,
    libraryId ? { libraryId } : "skip",
  );
  if (!siteId) {
    return (
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Library editing is unavailable outside a site.
      </p>
    );
  }
  if (libraryId)
    return (
      <LibraryExplorer
        access="manage"
        allowDownloads={value.allowDownloads !== false}
        embedded
        explorer={explorer}
      />
    );
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <Select onValueChange={(next) => onChange({ ...value, libraryId: next })}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a library" />
        </SelectTrigger>
        <SelectContent>
          {libraries?.map((library) => (
            <SelectItem key={library._id} value={library._id}>
              {library.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Libraries are created and managed from the BaseBlocks library area.
      </p>
    </div>
  );
}

function LibraryViewer({ value }: { value: LibraryContent }) {
  const libraryId = value.libraryId as LibraryId | undefined;
  const explorer = useQuery(
    api.libraries.getPublicExplorer,
    libraryId
      ? { libraryId, sessionTokens: getStoredAccessSessionTokens() }
      : "skip",
  );
  if (!libraryId)
    return (
      <p className="my-4 rounded-lg border p-6 text-center text-sm text-muted-foreground">
        No library configured.
      </p>
    );
  return (
    <LibraryExplorer
      access="read"
      allowDownloads={value.allowDownloads !== false}
      embedded
      explorer={explorer}
    />
  );
}

function LibraryNode({ node, updateAttributes }: OpenEditorNodeViewProps) {
  const value = readLibrary(node.attrs.library);
  return (
    <NodeViewWrapper contentEditable={false}>
      <section className="not-prose my-4 space-y-3 rounded-xl border bg-background p-4">
        <div className="flex items-center gap-2 text-sm">
          <Switch
            checked={value.allowDownloads !== false}
            onCheckedChange={(allowDownloads) =>
              updateAttributes({ library: { ...value, allowDownloads } })
            }
          />
          Allow downloads
        </div>
        <LibraryEditor
          onChange={(library) => updateAttributes({ library })}
          value={value}
        />
      </section>
    </NodeViewWrapper>
  );
}

export const libraryExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.library",
    nodeType: "baseblocksLibrary",
    label: "Library",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksLibrary",
      attrs: { library: { allowDownloads: true } },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ library: { default: { allowDownloads: true } } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-library]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-library": "" },
    ],
  },
  component: LibraryNode,
  slashMenu: { keywords: ["documents", "files", "folder"] },
  viewer: ({ node }) => (
    <LibraryViewer value={readLibrary(node.attrs?.library)} />
  ),
  exporters: {
    html: {
      baseblocksLibrary: ({ node, escapeAttribute }) => {
        const value = readLibrary(node.attrs?.library);
        return `<div data-baseblocks-library="${escapeAttribute(value.libraryId ?? "")}" data-allow-downloads="${value.allowDownloads !== false}"></div>`;
      },
    },
    text: { baseblocksLibrary: () => "[Document library]" },
  },
});
