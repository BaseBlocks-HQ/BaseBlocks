"use client";

import type { CheckboxField } from "@/types/elements";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckSquare } from "lucide-react";

function CheckboxEditor({ field }: FieldEditorProps) {
  const f = field as CheckboxField;
  return (
    <div className="flex items-start gap-3">
      <Checkbox disabled className="mt-0.5" />
      <div className="space-y-1">
        <Label className="text-sm font-medium">
          {f.label || "Checkbox"}
          {f.validation?.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {f.description && (
          <p className="text-xs text-muted-foreground">{f.description}</p>
        )}
      </div>
    </div>
  );
}

function CheckboxRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const f = field as CheckboxField;
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id={f.id}
          checked={(value as boolean) || false}
          onCheckedChange={onChange}
          className={error ? "border-destructive" : ""}
        />
        <div className="space-y-1">
          <Label htmlFor={f.id} className="text-sm font-medium cursor-pointer">
            {f.label}
            {f.validation?.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {f.description && (
            <p className="text-xs text-muted-foreground">{f.description}</p>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive ml-7">{error}</p>}
    </div>
  );
}

function CheckboxSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as CheckboxField;
  const update = (updates: Partial<CheckboxField>) => onChange({ ...f, ...updates });

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
  type: "checkbox",
  label: "Checkbox",
  icon: CheckSquare,
  Editor: CheckboxEditor,
  Renderer: CheckboxRenderer,
  Settings: CheckboxSettings,
});

export { CheckboxEditor, CheckboxRenderer, CheckboxSettings };
