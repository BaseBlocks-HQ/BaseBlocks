"use client";

/**
 * Builder Canvas
 * Main area where form fields are displayed and arranged
 */

import { cn } from "@/lib/utils";
import type { FormField } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { getFieldEditor } from "./field-registry";
import { useFormBuilder } from "./form-builder-context";

import "../fields";

interface FieldItemProps {
  field: FormField;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function FieldItem({ field, index, isSelected, onSelect }: FieldItemProps) {
  const { updateField, removeField, duplicateField, moveField, form } =
    useFormBuilder();
  const Editor = getFieldEditor(field.type);

  const _handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) {
      moveField(index, index - 1);
    }
  };

  const _handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index < form.fields.length - 1) {
      moveField(index, index + 1);
    }
  };

  if (!Editor) {
    return (
      <div className="p-4 border rounded-md bg-muted/50">
        <p className="text-sm text-muted-foreground">
          Unknown field type: {field.type}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative border rounded-lg transition-all cursor-pointer",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
          : "border-border hover:border-muted-foreground/50",
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Drag handle and actions */}
      <div
        className={cn(
          "absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected && "opacity-100",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 cursor-grab"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </div>

      {/* Field content */}
      <div className="p-4">
        <Editor
          field={field}
          onChange={(updated) => updateField(field.id, updated)}
        />
      </div>

      {/* Quick actions */}
      <div
        className={cn(
          "absolute -right-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected && "opacity-100",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            duplicateField(field.id);
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            removeField(field.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function BuilderCanvas() {
  const { form, selectedFieldId, selectField, addField } = useFormBuilder();

  if (form.fields.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">No fields yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add fields from the sidebar or click below to get started
            </p>
          </div>
          <Button variant="outline" onClick={() => addField("short-text")}>
            <Plus className="h-4 w-4 mr-2" />
            Add first field
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-3 pl-10 pr-10">
        {form.fields.map((field, index) => (
          <FieldItem
            key={field.id}
            field={field}
            index={index}
            isSelected={selectedFieldId === field.id}
            onSelect={() => selectField(field.id)}
          />
        ))}

        {/* Add field button at bottom */}
        <Button
          variant="ghost"
          className="w-full border-2 border-dashed h-12 text-muted-foreground hover:text-foreground"
          onClick={() => addField("short-text")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add field
        </Button>
      </div>
    </div>
  );
}
