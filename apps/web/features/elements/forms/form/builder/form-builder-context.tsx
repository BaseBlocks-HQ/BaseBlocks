"use client";

/**
 * Form Builder Context
 * Manages form state during editing
 */

import type {
  FormContent,
  FormField,
  FormFieldType,
} from "@baseblocks/types/elements";
import { createField } from "@baseblocks/types/elements";
import { type ReactNode, createContext, useCallback, useContext } from "react";

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface FormBuilderContextType {
  // Form data
  form: FormContent;

  // Field selection
  selectedFieldId: string | null;
  selectField: (id: string | null) => void;

  // Field operations
  addField: (type: FormFieldType, index?: number) => void;
  updateField: (id: string, updates: Partial<FormField>) => void;
  removeField: (id: string) => void;
  moveField: (fromIndex: number, toIndex: number) => void;
  duplicateField: (id: string) => void;

  // Form settings
  updateFormSettings: (updates: Partial<Omit<FormContent, "fields">>) => void;
}

const FormBuilderContext = createContext<FormBuilderContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface FormBuilderProviderProps {
  children: ReactNode;
  form: FormContent;
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onUpdate: (form: FormContent) => void;
}

export function FormBuilderProvider({
  children,
  form,
  selectedFieldId,
  onSelectField,
  onUpdate,
}: FormBuilderProviderProps) {
  const addField = useCallback(
    (type: FormFieldType, index?: number) => {
      const newField = createField(type);
      const fields = [...form.fields];

      if (index !== undefined) {
        fields.splice(index, 0, newField);
      } else {
        fields.push(newField);
      }

      onUpdate({ ...form, fields });
      onSelectField(newField.id);
    },
    [form, onUpdate, onSelectField],
  );

  const updateField = useCallback(
    (id: string, updates: Partial<FormField>) => {
      const fields = form.fields.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      ) as FormField[];
      onUpdate({ ...form, fields });
    },
    [form, onUpdate],
  );

  const removeField = useCallback(
    (id: string) => {
      const fields = form.fields.filter((f) => f.id !== id);
      onUpdate({ ...form, fields });
      if (selectedFieldId === id) {
        onSelectField(null);
      }
    },
    [form, onUpdate, selectedFieldId, onSelectField],
  );

  const moveField = useCallback(
    (fromIndex: number, toIndex: number) => {
      const fields = [...form.fields];
      const removed = fields.splice(fromIndex, 1)[0];
      if (!removed) return;
      fields.splice(toIndex, 0, removed);
      onUpdate({ ...form, fields });
    },
    [form, onUpdate],
  );

  const duplicateField = useCallback(
    (id: string) => {
      const original = form.fields.find((f) => f.id === id);
      if (!original) return;

      const fieldIndex = form.fields.findIndex((f) => f.id === id);
      const duplicate: FormField = {
        ...original,
        id: `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${original.name}_copy`,
        label: original.label ? `${original.label} (copy)` : "",
      } as FormField;

      const fields = [...form.fields];
      fields.splice(fieldIndex + 1, 0, duplicate);
      onUpdate({ ...form, fields });
      onSelectField(duplicate.id);
    },
    [form, onUpdate, onSelectField],
  );

  const updateFormSettings = useCallback(
    (updates: Partial<Omit<FormContent, "fields">>) => {
      onUpdate({ ...form, ...updates });
    },
    [form, onUpdate],
  );

  return (
    <FormBuilderContext.Provider
      value={{
        form,
        selectedFieldId,
        selectField: onSelectField,
        addField,
        updateField,
        removeField,
        moveField,
        duplicateField,
        updateFormSettings,
      }}
    >
      {children}
    </FormBuilderContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useFormBuilder() {
  const context = useContext(FormBuilderContext);
  if (!context) {
    throw new Error("useFormBuilder must be used within FormBuilderProvider");
  }
  return context;
}
