"use client";

import type { DateField } from "@baseblocks/types/elements";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import { Calendar } from "lucide-react";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";

function DateEditor({ field }: FieldEditorProps) {
  const f = field as DateField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label || "Date"}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <span>{f.placeholder || "Select a date..."}</span>
        <Calendar className="h-4 w-4" />
      </div>
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
    </div>
  );
}

function DateRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const f = field as DateField;
  return (
    <div className="space-y-2">
      <Label htmlFor={f.id} className="text-sm font-medium">
        {f.label}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <Input
        id={f.id}
        name={f.name}
        type="date"
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        required={f.validation?.required}
        className={error ? "border-destructive" : ""}
      />
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function DateSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as DateField;
  const update = (updates: Partial<DateField>) =>
    onChange({ ...f, ...updates });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Label</Label>
        <Input
          value={f.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Field label"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Placeholder</Label>
        <Input
          value={f.placeholder || ""}
          onChange={(e) => update({ placeholder: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Input
          value={f.description || ""}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Field Name</Label>
        <Input
          value={f.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Required</Label>
        <Switch
          checked={f.validation?.required || false}
          onCheckedChange={(checked) =>
            update({ validation: { ...f.validation, required: checked } })
          }
        />
      </div>
    </div>
  );
}

registerField({
  type: "date",
  label: "Date",
  icon: Calendar,
  Editor: DateEditor,
  Renderer: DateRenderer,
  Settings: DateSettings,
});
