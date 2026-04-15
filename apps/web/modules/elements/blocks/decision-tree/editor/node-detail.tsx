"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useSiteAssetUpload } from "@/lib/storage";
import { useEditorSite } from "@/modules/shared/contexts/editor-site-context";
import type { Id } from "@baseblocks/backend";
import type { DecisionTreeNode } from "@baseblocks/types/elements";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { getNodeDocument } from "../lib";

interface NodeDetailProps {
  node: DecisionTreeNode;
  onUpdateNodeName: (nodeId: string, name: string) => void;
  onUpdateDocument: (nodeId: string, document: unknown[]) => void;
}

export function NodeDetail({
  node,
  onUpdateNodeName,
  onUpdateDocument,
}: NodeDetailProps) {
  const [localName, setLocalName] = useState(node.name);

  const debouncedSaveName = useDebounceCallback((name: string) => {
    onUpdateNodeName(node.id, name);
  }, 500);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <h3 className="text-sm font-medium text-primary">Detail Panel</h3>
        <div>
          <Label htmlFor="node-name" className="text-xs text-muted-foreground">
            Option Name
          </Label>
          <Input
            id="node-name"
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              debouncedSaveName(e.target.value);
            }}
            className="mt-1 text-lg font-semibold"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <NodeBlockNoteEditor
          key={node.id}
          document={getNodeDocument(node)}
          onChange={(doc) => onUpdateDocument(node.id, doc)}
        />
      </div>
    </div>
  );
}

function NodeBlockNoteEditor({
  document,
  onChange,
}: {
  document: unknown[];
  onChange: (document: unknown[]) => void;
}) {
  const { resolvedTheme } = useTheme();
  const { siteId } = useEditorSite();
  const { uploadSiteAsset } = useSiteAssetUpload();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";
  const [initialContent] = useState(() =>
    document && document.length > 0 ? (document as Block[]) : undefined,
  );

  const editor = useCreateBlockNote({
    initialContent,
    uploadFile: async (file) => {
      const asset = await uploadSiteAsset(file, siteId as Id<"sites">);
      if (!asset) {
        throw new Error("Upload failed");
      }
      return asset.url;
    },
  });

  return (
    // Stop keyboard events from bubbling to parent DnD and node-list handlers
    <div
      role="presentation"
      className="[&_.bn-container]:!border-none [&_.bn-editor]:!pl-12 [&_.bn-editor]:!pr-4 [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <BlockNoteView
        editor={editor}
        theme={blockNoteTheme}
        onChange={() => onChange(editor.document)}
      />
    </div>
  );
}
