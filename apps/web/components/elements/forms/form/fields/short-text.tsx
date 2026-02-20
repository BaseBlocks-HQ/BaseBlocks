"use client";

import type { ShortTextField } from "@repo/types/elements";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { Type } from "lucide-react";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";

// =============================================================================
// EDITOR (Builder Canvas Preview)
// =============================================================================

function ShortTextEditor({ field }: FieldEditorProps) {
  const f = field as ShortTextField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label || "Short Text"}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <Input
        placeholder={f.placeholder || "Enter text..."}
        disabled
        className="bg-muted/50"
      />
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
    </div>
  );
}

// =============================================================================
// RENDERER (Published Form)
// =============================================================================

function ShortTextRenderer({
  field,
  value,
  onChange,
  error,
}: FieldRendererProps) {
  const f = field as ShortTextField;
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
        placeholder={f.placeholder}
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        required={f.validation?.required}
        minLength={f.validation?.minLength}
        maxLength={f.validation?.maxLength}
        className={error ? "border-destructive" : ""}
      />
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// =============================================================================
// SETTINGS (Configuration Panel)
// =============================================================================

function ShortTextSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as ShortTextField;

  const update = (updates: Partial<ShortTextField>) => {
    onChange({ ...f, ...updates });
  };

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
          placeholder="Placeholder text"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Description</Label>
        <Input
          value={f.description || ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Help text"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Field Name</Label>
        <Input
          value={f.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="field_name"
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

// =============================================================================
// REGISTER
// =============================================================================

registerField({
  type: "short-text",
  label: "Short Text",
  icon: Type,
  Editor: ShortTextEditor,
  Renderer: ShortTextRenderer,
  Settings: ShortTextSettings,
});

export { ShortTextEditor, ShortTextRenderer, ShortTextSettings };
