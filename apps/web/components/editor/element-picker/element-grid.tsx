"use client";

import type { AnyRegistryEntry } from "@/components/elements/registry";
import type { ElementType, LayoutType } from "@repo/types/elements";
import { ElementCard } from "./element-card";

interface ElementGridProps {
  title: string;
  entries: AnyRegistryEntry[];
  onSelect: (type: ElementType | LayoutType) => void;
}

export function ElementGrid({ title, entries, onSelect }: ElementGridProps) {
  return (
    <div className="p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {entries.map((entry) => (
          <ElementCard
            key={entry.type}
            label={entry.label}
            icon={entry.icon}
            preview={entry.preview}
            onClick={() => onSelect(entry.type)}
          />
        ))}
      </div>
    </div>
  );
}
