"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import type { DecisionTreeNode } from "@baseblocks/types/elements";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    setLocalName(node.name);
  }, [node.name]);

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
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";
  const initialContentRef = useRef(document);

  const editor = useCreateBlockNote({
    initialContent:
      initialContentRef.current && initialContentRef.current.length > 0
        ? (initialContentRef.current as Block[])
        : undefined,
  });

  return (
    // Stop keyboard events from bubbling to parent DnD and node-list handlers
    <div
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
