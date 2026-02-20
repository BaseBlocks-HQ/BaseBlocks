"use client";

import { ElementRendererWrapper } from "@/components/elements/element-renderer-wrapper";
import type {
  AnyContent,
  DecisionTreeContentBlock,
} from "@repo/types/elements";

export function ContentBlockRenderer({
  blocks,
}: {
  blocks: DecisionTreeContentBlock[];
}) {
  if (blocks.length === 0) return null;

  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {sorted.map((block) => (
        <ElementRendererWrapper
          key={block.id}
          id={block.id}
          type={block.type}
          content={block.content as AnyContent}
        />
      ))}
    </div>
  );
}
