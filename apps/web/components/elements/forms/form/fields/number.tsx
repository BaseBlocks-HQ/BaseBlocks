"use client";

import type { NumberField } from "@repo/types/elements";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { Hash } from "lucide-react";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";

function NumberEditor({ field }: FieldEditorProps) {
  const f = field as NumberField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label || "Number"}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <Input
        type="number"
        placeholder={f.placeholder || "0"}
        disabled
        className="bg-muted/50"
      />
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
    </div>
  );
}

function NumberRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const f = field as NumberField;
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
        type="number"
        placeholder={f.placeholder}
        value={(value as number) ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : undefined)
        }
        required={f.validation?.required}
        min={f.min ?? f.validation?.min}
        max={f.max ?? f.validation?.max}
        step={f.step}
        className={error ? "border-destructive" : ""}
      />
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function NumberSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as NumberField;
  const update = (updates: Partial<NumberField>) =>
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
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            value={f.min ?? ""}
            onChange={(e) =>
              update({
                min: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            value={f.max ?? ""}
            onChange={(e) =>
              update({
                max: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
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
  type: "number",
  label: "Number",
  icon: Hash,
  Editor: NumberEditor,
  Renderer: NumberRenderer,
  Settings: NumberSettings,
});

export { NumberEditor, NumberRenderer, NumberSettings };
