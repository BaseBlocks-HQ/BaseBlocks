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
} from "@/types/elements";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

// Element editor props interface
export interface ElementEditorProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
  isSelected?: boolean;
  onUpdate: (content: ContentFor<T>) => Promise<unknown> | void;
  onRemove?: () => Promise<unknown> | void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

// Element renderer props interface
export interface ElementRendererProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}

// Element preview props interface (for UI picker)
export interface ElementPreviewProps {
  className?: string;
}

// Config panel props interface
export interface ElementConfigPanelProps<T extends ElementType = ElementType> {
  content: ContentFor<T>;
  onUpdate: (content: ContentFor<T>) => Promise<unknown> | void;
}

// Registry entry for an element
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

// Layout registry entry (separate because layouts have different structure)
export interface LayoutRegistryEntry {
  type: LayoutType;
  category: "layouts";
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  preview?: ComponentType<ElementPreviewProps>;
}

// Type for any registry entry
export type AnyRegistryEntry =
  | ElementRegistryEntry<ElementType>
  | LayoutRegistryEntry;

// The registry class
class ElementRegistry {
  private elements = new Map<ElementType, ElementRegistryEntry<ElementType>>();
  private layouts = new Map<LayoutType, LayoutRegistryEntry>();

  // Register an element
  register<T extends ElementType>(entry: ElementRegistryEntry<T>): void {
    this.elements.set(
      entry.type,
      entry as unknown as ElementRegistryEntry<ElementType>,
    );
  }

  // Register a layout
  registerLayout(entry: LayoutRegistryEntry): void {
    this.layouts.set(entry.type, entry);
  }

  // Get an element by type
  get<T extends ElementType>(type: T): ElementRegistryEntry<T> | undefined {
    return this.elements.get(type) as ElementRegistryEntry<T> | undefined;
  }

  // Get a layout by type
  getLayout(type: LayoutType): LayoutRegistryEntry | undefined {
    return this.layouts.get(type);
  }

  // Get all elements
  getAll(): ElementRegistryEntry<ElementType>[] {
    return Array.from(this.elements.values());
  }

  // Get all layouts
  getAllLayouts(): LayoutRegistryEntry[] {
    return Array.from(this.layouts.values());
  }

  // Get elements by category
  getByCategory(category: ElementCategory): AnyRegistryEntry[] {
    if (category === "layouts") {
      return Array.from(this.layouts.values());
    }
    return Array.from(this.elements.values()).filter(
      (entry) => entry.category === category,
    );
  }

  // Get editor component for an element type
  getEditor<T extends ElementType>(
    type: T,
  ): ComponentType<ElementEditorProps<T>> | undefined {
    const entry = this.elements.get(type);
    return entry?.editor as ComponentType<ElementEditorProps<T>> | undefined;
  }

  // Get renderer component for an element type
  getRenderer<T extends ElementType>(
    type: T,
  ): ComponentType<ElementRendererProps<T>> | undefined {
    const entry = this.elements.get(type);
    return entry?.renderer as
      | ComponentType<ElementRendererProps<T>>
      | undefined;
  }

  // Get preview component
  getPreview(
    type: ElementType | LayoutType,
  ): ComponentType<ElementPreviewProps> | undefined {
    const elementEntry = this.elements.get(type as ElementType);
    if (elementEntry) return elementEntry.preview;

    const layoutEntry = this.layouts.get(type as LayoutType);
    return layoutEntry?.preview;
  }

  // Get config panel component for an element type
  getConfigPanel<T extends ElementType>(
    type: T,
  ): ComponentType<ElementConfigPanelProps<T>> | undefined {
    const entry = this.elements.get(type);
    return entry?.configPanel as
      | ComponentType<ElementConfigPanelProps<T>>
      | undefined;
  }

  // Check if an element has a config panel
  hasConfigPanel(type: ElementType): boolean {
    const entry = this.elements.get(type);
    return !!entry?.configPanel;
  }

  // Get label for any type
  getLabel(type: ElementType | LayoutType): string {
    const elementEntry = this.elements.get(type as ElementType);
    if (elementEntry) return elementEntry.label;

    const layoutEntry = this.layouts.get(type as LayoutType);
    if (layoutEntry) return layoutEntry.label;

    return type;
  }

  // Get icon for any type
  getIcon(type: ElementType | LayoutType): LucideIcon | undefined {
    const elementEntry = this.elements.get(type as ElementType);
    if (elementEntry) return elementEntry.icon;

    const layoutEntry = this.layouts.get(type as LayoutType);
    return layoutEntry?.icon;
  }

  // Get default content for an element type
  getDefaultContent<T extends ElementType>(type: T): ContentFor<T> | undefined {
    const entry = this.elements.get(type);
    return entry?.defaultContent as ContentFor<T> | undefined;
  }

  // Check if an element is registered
  isRegistered(type: ElementType | LayoutType): boolean {
    return (
      this.elements.has(type as ElementType) ||
      this.layouts.has(type as LayoutType)
    );
  }

  // Get all registered element types
  getRegisteredTypes(): ElementType[] {
    return Array.from(this.elements.keys());
  }

  // Get all registered layout types
  getRegisteredLayoutTypes(): LayoutType[] {
    return Array.from(this.layouts.keys());
  }

  // Search elements by query (searches label, description, keywords)
  search(query: string): AnyRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    const results: AnyRegistryEntry[] = [];

    // Search elements
    for (const entry of this.elements.values()) {
      if (
        entry.label.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery) ||
        entry.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))
      ) {
        results.push(entry);
      }
    }

    // Search layouts
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

// Singleton instance
const registry = new ElementRegistry();

// Export singleton methods for convenience
export const registerElement = <T extends ElementType>(
  entry: ElementRegistryEntry<T>,
) => registry.register(entry);

export const registerLayout = (entry: LayoutRegistryEntry) =>
  registry.registerLayout(entry);

export const getElement = <T extends ElementType>(type: T) =>
  registry.get(type);

export const getLayoutEntry = (type: LayoutType) => registry.getLayout(type);

export const getAllElements = () => registry.getAll();

export const getAllLayouts = () => registry.getAllLayouts();

export const getElementsByCategory = (category: ElementCategory) =>
  registry.getByCategory(category);

export const getElementEditor = <T extends ElementType>(type: T) =>
  registry.getEditor(type);

export const getElementRenderer = <T extends ElementType>(type: T) =>
  registry.getRenderer(type);

export const getElementPreview = (type: ElementType | LayoutType) =>
  registry.getPreview(type);

export const getElementConfigPanel = <T extends ElementType>(type: T) =>
  registry.getConfigPanel(type);

export const hasElementConfigPanel = (type: ElementType) =>
  registry.hasConfigPanel(type);

export const getElementLabel = (type: ElementType | LayoutType) =>
  registry.getLabel(type);

export const getElementIcon = (type: ElementType | LayoutType) =>
  registry.getIcon(type);

export const getDefaultContent = <T extends ElementType>(type: T) =>
  registry.getDefaultContent(type);

export const isElementRegistered = (type: ElementType | LayoutType) =>
  registry.isRegistered(type);

export const getRegisteredElementTypes = () => registry.getRegisteredTypes();

export const getRegisteredLayoutTypes = () =>
  registry.getRegisteredLayoutTypes();

export const searchElements = (query: string) => registry.search(query);

// Export the registry class for advanced usage
export { ElementRegistry };

// Export the singleton for direct access if needed
export default registry;
