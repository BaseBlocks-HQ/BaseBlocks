"use client";

import type { AnyRegistryEntry } from "@/modules/elements/framework/registry";
import { CollapsibleSettingsSection } from "@/modules/elements/panels/shared/editor-panel-primitives";
import { ElementCard } from "./element-card";

interface ElementGridProps {
  title: string;
  entries: AnyRegistryEntry[];
  onSelect: (type: string) => void;
}

/** ~15px panel padding (Framer fresco panel), ~10px between list and tiles. */
export function ElementGrid({ title, entries, onSelect }: ElementGridProps) {
  return (
    <div className="px-[15px] pb-3 pt-[15px]">
      <CollapsibleSettingsSection
        title={title}
        contentClassName="flex flex-col gap-3 p-2.5"
      >
        {entries.map((entry) => (
          <ElementCard
            key={entry.type}
            description={entry.description}
            label={entry.label}
            icon={entry.icon}
            preview={entry.preview}
            onClick={() => onSelect(entry.type)}
          />
        ))}
      </CollapsibleSettingsSection>
    </div>
  );
}
