"use client";

import "@blocknote/mantine/style.css";

import type { DecisionTreeNode } from "@baseblocks/types/elements";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "next-themes";
import { getNodeDocument } from "../lib";

interface DetailPanelProps {
  node: DecisionTreeNode;
}

export function DetailPanel({ node }: DetailPanelProps) {
  const document = getNodeDocument(node);

  return (
    <ScrollArea className="h-full">
      <div className="w-full space-y-2 px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-lg font-semibold text-foreground">{node.name}</h2>
        {document.length > 0 && (
          <DetailContent key={node.id} document={document} />
        )}
      </div>
    </ScrollArea>
  );
}

function DetailContent({ document }: { document: unknown[] }) {
  const { resolvedTheme } = useTheme();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";

  const editor = useCreateBlockNote({
    initialContent: document as Block[],
  });

  return (
    <div className="[&_.bn-container]:!border-none [&_.bn-editor]:!px-0 [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent">
      <BlockNoteView editor={editor} editable={false} theme={blockNoteTheme} />
    </div>
  );
}
