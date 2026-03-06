/**
 * Unified Element Registry
 * Single source of truth for all element types across categories
 */

import type {
  AnyContent,
  ContentFor,
  ElementCategory,
  ElementType,
  LayoutType,
  SaveStatus,
} from "@baseblocks/types/elements";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface ElementEditorProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
  isSelected?: boolean;
  onUpdate: (content: ContentFor<T>) => void;
  onRemove?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

export interface ElementRendererProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}

export interface ElementPreviewProps {
  className?: string;
}

export interface ElementConfigPanelProps<T extends ElementType = ElementType> {
  content: ContentFor<T>;
  onUpdate: (content: ContentFor<T>) => void;
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

export interface LayoutRegistryEntry {
  type: LayoutType;
  category: "layouts";
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  preview?: ComponentType<ElementPreviewProps>;
}

export type AnyRegistryEntry =
  | ElementRegistryEntry<ElementType>
  | LayoutRegistryEntry;

class ElementRegistry {
  private elements = new Map<ElementType, ElementRegistryEntry<ElementType>>();
  private layouts = new Map<LayoutType, LayoutRegistryEntry>();

  register<T extends ElementType>(entry: ElementRegistryEntry<T>): void {
    this.elements.set(
      entry.type,
      entry as unknown as ElementRegistryEntry<ElementType>,
    );
  }

  registerLayout(entry: LayoutRegistryEntry): void {
    this.layouts.set(entry.type, entry);
  }

  get<T extends ElementType>(type: T): ElementRegistryEntry<T> | undefined {
    return this.elements.get(type) as ElementRegistryEntry<T> | undefined;
  }

  getLayout(type: LayoutType): LayoutRegistryEntry | undefined {
    return this.layouts.get(type);
  }

  getAll(): ElementRegistryEntry<ElementType>[] {
    return Array.from(this.elements.values());
  }

  getAllLayouts(): LayoutRegistryEntry[] {
    return Array.from(this.layouts.values());
  }

  getByCategory(category: ElementCategory): AnyRegistryEntry[] {
    if (category === "layouts") {
      return Array.from(this.layouts.values());
    }
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

  getRenderer<T extends ElementType>(
    type: T,
  ): ComponentType<ElementRendererProps<T>> | undefined {
    const entry = this.elements.get(type);
    return entry?.renderer as
      | ComponentType<ElementRendererProps<T>>
      | undefined;
  }

  getPreview(
    type: ElementType | LayoutType,
  ): ComponentType<ElementPreviewProps> | undefined {
    const elementEntry = this.elements.get(type as ElementType);
    if (elementEntry) return elementEntry.preview;

    const layoutEntry = this.layouts.get(type as LayoutType);
    return layoutEntry?.preview;
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

  getLabel(type: ElementType | LayoutType): string {
    const elementEntry = this.elements.get(type as ElementType);
    if (elementEntry) return elementEntry.label;

    const layoutEntry = this.layouts.get(type as LayoutType);
    if (layoutEntry) return layoutEntry.label;

    return type;
  }

  getIcon(type: ElementType | LayoutType): LucideIcon | undefined {
    const elementEntry = this.elements.get(type as ElementType);
    if (elementEntry) return elementEntry.icon;

    const layoutEntry = this.layouts.get(type as LayoutType);
    return layoutEntry?.icon;
  }

  getDefaultContent<T extends ElementType>(type: T): ContentFor<T> | undefined {
    const entry = this.elements.get(type);
    return entry?.defaultContent as ContentFor<T> | undefined;
  }

  isRegistered(type: ElementType | LayoutType): boolean {
    return (
      this.elements.has(type as ElementType) ||
      this.layouts.has(type as LayoutType)
    );
  }

  getRegisteredTypes(): ElementType[] {
    return Array.from(this.elements.keys());
  }

  getRegisteredLayoutTypes(): LayoutType[] {
    return Array.from(this.layouts.keys());
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

    for (const entry of this.layouts.values()) {
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

export const registerLayout = (entry: LayoutRegistryEntry) =>
  registry.registerLayout(entry);

const getElement = <T extends ElementType>(type: T) => registry.get(type);

const getLayoutEntry = (type: LayoutType) => registry.getLayout(type);

const getAllElements = () => registry.getAll();

const getAllLayouts = () => registry.getAllLayouts();

export const getElementsByCategory = (category: ElementCategory) =>
  registry.getByCategory(category);

export const getElementEditor = <T extends ElementType>(type: T) =>
  registry.getEditor(type);

export const getElementRenderer = <T extends ElementType>(type: T) =>
  registry.getRenderer(type);

const getElementPreview = (type: ElementType | LayoutType) =>
  registry.getPreview(type);

export const getElementConfigPanel = <T extends ElementType>(type: T) =>
  registry.getConfigPanel(type);

export const hasElementConfigPanel = (type: ElementType) =>
  registry.hasConfigPanel(type);

const getElementLabel = (type: ElementType | LayoutType) =>
  registry.getLabel(type);

const getElementIcon = (type: ElementType | LayoutType) =>
  registry.getIcon(type);

export const getDefaultContent = <T extends ElementType>(type: T) =>
  registry.getDefaultContent(type);

const isElementRegistered = (type: ElementType | LayoutType) =>
  registry.isRegistered(type);

const getRegisteredElementTypes = () => registry.getRegisteredTypes();

const getRegisteredLayoutTypes = () => registry.getRegisteredLayoutTypes();

const searchElements = (query: string) => registry.search(query);
