"use client";

import type { AnyRegistryEntry } from "@/modules/site-elements/registry";
import { CollapsibleSettingsSection } from "@/modules/editor/settings/shared/editor-panel-primitives";
import { ElementCard } from "./element-card";

interface ElementGridProps {
  title: string;
  entries: AnyRegistryEntry[];
  onSelect: (type: string) => void;
}

export function ElementGrid({ title, entries, onSelect }: ElementGridProps) {
  return (
    <div className="p-4">
      <CollapsibleSettingsSection title={title} contentVariant="stack">
        {entries.map((entry) => (
          <ElementCard
            key={entry.type}
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
