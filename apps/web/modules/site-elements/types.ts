import type {
  AnyContent,
  ContentFor,
  ElementType,
  LayoutType,
  SaveStatus,
} from "@baseblocks/domain/elements";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface ElementRendererProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}

export type ElementCategory =
  | "site"
  | "customization"
  | "navigation"
  | "layouts"
  | "blocks";

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

// Registry storage is intentionally heterogeneous: each manifest entry keeps its
// own element-specific props, and callers resolve by `type` at runtime.
// biome-ignore lint/suspicious/noExplicitAny: heterogeneous component registry boundary
export type ElementEditorComponent = ComponentType<any>;
// biome-ignore lint/suspicious/noExplicitAny: heterogeneous component registry boundary
export type ElementRendererComponent = ComponentType<any>;
// biome-ignore lint/suspicious/noExplicitAny: heterogeneous component registry boundary
export type ElementConfigPanelComponent = ComponentType<any>;

export interface ElementManifestEntry<T extends ElementType = ElementType> {
  type: T;
  category: "blocks";
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  editor: ElementEditorComponent;
  renderer: ElementRendererComponent;
  preview?: ComponentType<ElementPreviewProps>;
  configPanel?: ElementConfigPanelComponent;
  defaultContent: AnyContent;
}

export interface LayoutManifestEntry {
  type: LayoutType;
  category: "layouts";
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  preview?: ComponentType<ElementPreviewProps>;
}

export type AnyManifestEntry = ElementManifestEntry | LayoutManifestEntry;

export type AnyRegistryEntry = AnyManifestEntry;
