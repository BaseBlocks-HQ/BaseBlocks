"use client";

/**
 * Field Picker
 * Sidebar component to add new fields to the form
 */

import { useFormBuilder } from "./form-builder-context";
import { getAllFields } from "./field-registry";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FormFieldType } from "@/types/elements";

// Import fields to register them
import "../fields";

export function FieldPicker() {
  const { addField } = useFormBuilder();
  const fields = getAllFields();

  const handleAddField = (type: FormFieldType) => {
    addField(type);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">Add Field</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {fields.map((entry) => {
            const Icon = entry.icon;
            return (
              <Button
                key={entry.type}
                variant="ghost"
                className="w-full justify-start gap-2 h-9"
                onClick={() => handleAddField(entry.type)}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{entry.label}</span>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
