/**
 * Unified Element Registry
 * Single source of truth for all element types across categories
 */

import type {
  AnyContent,
  ContentFor,
  ElementType,
  SaveStatus,
} from "@baseblocks/domain/elements";
import type { ElementRendererProps } from "@/modules/site-runtime/rendering";
import type { ElementCategory } from "@/modules/site-elements/categories";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export type { ElementRendererProps } from "@/modules/site-runtime/rendering";

export interface ElementEditorProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
  isSelected?: boolean;
  onUpdate: (content: ContentFor<T>) => void;
  onRemove?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

export interface ElementPreviewProps {
  className?: string;
}

export interface ElementConfigPanelProps<T extends ElementType = ElementType> {
  content: ContentFor<T>;
  onUpdate: (content: ContentFor<T>) => void;
  onRemove?: () => void;
}

export interface ElementRegistryEntry<T extends ElementType = ElementType> {
  type: T;
  category: ElementCategory;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  editor?: ComponentType<ElementEditorProps<T>>;
  renderer?: ComponentType<ElementRendererProps<T>>;
  preview?: ComponentType<ElementPreviewProps>;
  configPanel?: ComponentType<ElementConfigPanelProps<T>>;
  defaultContent: AnyContent; // Using AnyContent for flexibility in registration
}

export type AnyRegistryEntry = ElementRegistryEntry<ElementType>;

class ElementRegistry {
  private elements = new Map<ElementType, ElementRegistryEntry<ElementType>>();

  register<T extends ElementType>(entry: ElementRegistryEntry<T>): void {
    this.elements.set(
      entry.type,
      entry as unknown as ElementRegistryEntry<ElementType>,
    );
  }

  get<T extends ElementType>(type: T): ElementRegistryEntry<T> | undefined {
    return this.elements.get(type) as ElementRegistryEntry<T> | undefined;
  }

  getAll(): ElementRegistryEntry<ElementType>[] {
    return Array.from(this.elements.values());
  }

  getByCategory(category: ElementCategory): AnyRegistryEntry[] {
    return Array.from(this.elements.values()).filter(
      (entry) => entry.category === category,
    );
  }

  getEditor<T extends ElementType>(
    type: T,
  ): ComponentType<ElementEditorProps<T>> | undefined {
    const entry = this.elements.get(type);
    return entry?.editor as ComponentType<ElementEditorProps<T>> | undefined;
  }

  getPreview(type: ElementType): ComponentType<ElementPreviewProps> | undefined {
    return this.elements.get(type)?.preview;
  }

  getConfigPanel<T extends ElementType>(
    type: T,
  ): ComponentType<ElementConfigPanelProps<T>> | undefined {
    const entry = this.elements.get(type);
    return entry?.configPanel as
      | ComponentType<ElementConfigPanelProps<T>>
      | undefined;
  }

  hasConfigPanel(type: ElementType): boolean {
    const entry = this.elements.get(type);
    return !!entry?.configPanel;
  }

  getLabel(type: ElementType): string {
    const elementEntry = this.elements.get(type);
    if (elementEntry) return elementEntry.label;
    return type;
  }

  getIcon(type: ElementType): LucideIcon | undefined {
    return this.elements.get(type)?.icon;
  }

  getDefaultContent<T extends ElementType>(type: T): ContentFor<T> | undefined {
    const entry = this.elements.get(type);
    return entry?.defaultContent as ContentFor<T> | undefined;
  }

  isRegistered(type: ElementType): boolean {
    return this.elements.has(type);
  }

  getRegisteredTypes(): ElementType[] {
    return Array.from(this.elements.keys());
  }

  search(query: string): AnyRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    const results: AnyRegistryEntry[] = [];

    for (const entry of this.elements.values()) {
      if (
        entry.label.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))
      ) {
        results.push(entry);
      }
    }

    return results;
  }
}

const registry = new ElementRegistry();

export const registerElement = <T extends ElementType>(
  entry: ElementRegistryEntry<T>,
) => registry.register(entry);

export const getElementsByCategory = (category: ElementCategory) =>
  registry.getByCategory(category);

export const getElementEditor = <T extends ElementType>(type: T) =>
  registry.getEditor(type);

export const getElementConfigPanel = <T extends ElementType>(type: T) =>
  registry.getConfigPanel(type);

export const hasElementConfigPanel = (type: ElementType) =>
  registry.hasConfigPanel(type);

export const getDefaultContent = <T extends ElementType>(type: T) =>
  registry.getDefaultContent(type);
