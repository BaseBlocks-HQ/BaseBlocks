/**
 * Form Field Registry
 * Manages field type definitions for the form builder
 */

import type { FormField, FormFieldType } from "@baseblocks/types/elements";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface FieldEditorProps {
  field: FormField;
  onChange: (field: FormField) => void;
}

export interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export interface FieldSettingsProps {
  field: FormField;
  onChange: (field: FormField) => void;
}

export interface FieldRegistryEntry {
  type: FormFieldType;
  label: string;
  icon: LucideIcon;
  /** Preview in builder canvas */
  Editor: ComponentType<FieldEditorProps>;
  /** Render in published form */
  Renderer: ComponentType<FieldRendererProps>;
  /** Settings panel */
  Settings: ComponentType<FieldSettingsProps>;
}

class FormFieldRegistry {
  private fields = new Map<FormFieldType, FieldRegistryEntry>();

  register(entry: FieldRegistryEntry): void {
    this.fields.set(entry.type, entry);
  }

  get(type: FormFieldType): FieldRegistryEntry | undefined {
    return this.fields.get(type);
  }

  getAll(): FieldRegistryEntry[] {
    return Array.from(this.fields.values());
  }

  getEditor(type: FormFieldType): ComponentType<FieldEditorProps> | undefined {
    return this.fields.get(type)?.Editor;
  }

  getRenderer(
    type: FormFieldType,
  ): ComponentType<FieldRendererProps> | undefined {
    return this.fields.get(type)?.Renderer;
  }

  getSettings(
    type: FormFieldType,
  ): ComponentType<FieldSettingsProps> | undefined {
    return this.fields.get(type)?.Settings;
  }
}

export const fieldRegistry = new FormFieldRegistry();

export const registerField = (entry: FieldRegistryEntry) =>
  fieldRegistry.register(entry);
export const getFieldEntry = (type: FormFieldType) => fieldRegistry.get(type);
export const getAllFields = () => fieldRegistry.getAll();
export const getFieldEditor = (type: FormFieldType) =>
  fieldRegistry.getEditor(type);
export const getFieldRenderer = (type: FormFieldType) =>
  fieldRegistry.getRenderer(type);
export const getFieldSettings = (type: FormFieldType) =>
  fieldRegistry.getSettings(type);
