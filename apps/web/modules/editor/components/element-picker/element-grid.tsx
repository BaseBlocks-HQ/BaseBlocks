"use client";

import type { AnyRegistryEntry } from "@/modules/elements/framework/registry";
import { CollapsibleSettingsSection } from "@/modules/elements/panels/shared/editor-panel-primitives";
import type { ElementType } from "@baseblocks/types/elements";
import { ElementCard } from "./element-card";

interface ElementGridProps {
  title: string;
  entries: AnyRegistryEntry[];
  onSelect: (type: string) => void;
}

const SECTION_TYPES = new Set<ElementType>(["search", "library", "quicklinks"]);
const MEDIA_TYPES = new Set<ElementType>(["image"]);

function renderEntryList(
  entries: AnyRegistryEntry[],
  onSelect: (type: string) => void,
) {
  return entries.map((entry) => (
    <ElementCard
      key={entry.type}
      description={entry.description}
      label={entry.label}
      icon={entry.icon}
      preview={entry.preview}
      onClick={() => onSelect(entry.type)}
    />
  ));
}

export function ElementGrid({ title, entries, onSelect }: ElementGridProps) {
  if (title === "Blocks") {
    const sections = entries.filter((entry) =>
      SECTION_TYPES.has(entry.type as ElementType),
    );
    const media = entries.filter((entry) =>
      MEDIA_TYPES.has(entry.type as ElementType),
    );
    const blocks = entries.filter(
      (entry) =>
        !SECTION_TYPES.has(entry.type as ElementType) &&
        !MEDIA_TYPES.has(entry.type as ElementType),
    );

    return (
      <div className="p-4">
        <div className="flex flex-col gap-4">
          {sections.length > 0 ? (
            <CollapsibleSettingsSection title="Sections" contentVariant="stack">
              {renderEntryList(sections, onSelect)}
            </CollapsibleSettingsSection>
          ) : null}

          {blocks.length > 0 ? (
            <CollapsibleSettingsSection
              title="Core Blocks"
              contentVariant="stack"
            >
              {renderEntryList(blocks, onSelect)}
            </CollapsibleSettingsSection>
          ) : null}

          {media.length > 0 ? (
            <CollapsibleSettingsSection title="Media" contentVariant="stack">
              {renderEntryList(media, onSelect)}
            </CollapsibleSettingsSection>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <CollapsibleSettingsSection title={title} contentVariant="stack">
        {renderEntryList(entries, onSelect)}
      </CollapsibleSettingsSection>
    </div>
  );
}
