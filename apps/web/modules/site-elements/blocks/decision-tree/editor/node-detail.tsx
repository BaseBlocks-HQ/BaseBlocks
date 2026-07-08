"use client";

import "@blocknote/mantine/style.css";

import { useSiteAssetUpload } from "@/lib/files";
import { useEditorSite } from "@/modules/editor/app/editor-context";
import type { Id } from "@baseblocks/backend";
import type { DecisionTreeNode } from "@baseblocks/domain/elements";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("elements.decisionTree");
  const [localName, setLocalName] = useState(node.name);

  const debouncedSaveName = useDebounceCallback((name: string) => {
    onUpdateNodeName(node.id, name);
  }, 500);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 px-2.5 py-2">
        <div>
          <Label
            htmlFor="node-name"
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t("optionNameLabel")}
          </Label>
          <Input
            id="node-name"
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              debouncedSaveName(e.target.value);
            }}
            className="mt-1 h-10 rounded-lg border-border/70 text-base font-semibold shadow-none"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <NodeBlockNoteEditor
          key={node.id}
          document={getNodeDocument(node)}
          onChange={(doc) => onUpdateDocument(node.id, doc)}
        />
      </ScrollArea>
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
  const t = useTranslations("elements.decisionTree");
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
        throw new Error(t("uploadFailed"));
      }
      return asset.url;
    },
  });

  return (
    // Stop keyboard events from bubbling to parent DnD and node-list handlers
    <div
      role="presentation"
      className="[&_.bn-container]:!border-none [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent [&_.bn-editor]:!pl-5 [&_.bn-editor]:!pr-2.5 [&_.bn-editor]:!pt-2.5"
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
