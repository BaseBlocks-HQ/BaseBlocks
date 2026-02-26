"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import type { DecisionTreeNode } from "@baseblocks/types/elements";
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
    <div className="h-full overflow-y-auto">
      <div className="px-5 py-5 space-y-4 sm:px-6 sm:py-6 sm:space-y-5">
        <h2 className="text-xl font-bold text-primary sm:text-2xl">
          {node.name}
        </h2>
        {document.length > 0 && (
          <DetailContent key={node.id} document={document} />
        )}
      </div>
    </div>
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
