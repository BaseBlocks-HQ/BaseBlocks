"use client";

/**
 * Field Settings Panel
 * Right sidebar to configure the selected field
 */

import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { getFieldEntry, getFieldSettings } from "./field-registry";
import { useFormBuilder } from "./form-builder-context";

// Import fields to register them
import "../fields";

export function FieldSettingsPanel() {
  const { form, selectedFieldId, selectField, updateField, removeField } =
    useFormBuilder();

  const selectedField = form.fields.find((f) => f.id === selectedFieldId);

  if (!selectedField) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b">
          <h3 className="text-sm font-medium">Field Settings</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select a field to edit its settings
          </p>
        </div>
      </div>
    );
  }

  const Settings = getFieldSettings(selectedField.type);
  const entry = getFieldEntry(selectedField.type);

  if (!Settings) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b">
          <h3 className="text-sm font-medium">Field Settings</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">
            No settings available for this field type
          </p>
        </div>
      </div>
    );
  }

  const Icon = entry?.icon;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h3 className="text-sm font-medium">{entry?.label || "Settings"}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => selectField(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-3">
          <Settings
            field={selectedField}
            onChange={(updated) => updateField(selectedField.id, updated)}
          />
        </div>
      </div>

      <div className="p-3 border-t flex-shrink-0">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            removeField(selectedField.id);
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Field
        </Button>
      </div>
    </div>
  );
}
