"use client";

import type { LongTextField } from "@baseblocks/types/elements";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import { Textarea } from "@baseblocks/ui/textarea";
import { AlignLeft } from "lucide-react";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";

function LongTextEditor({ field }: FieldEditorProps) {
  const f = field as LongTextField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label || "Long Text"}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <Textarea
        placeholder={f.placeholder || "Enter text..."}
        rows={f.rows || 4}
        disabled
        className="bg-muted/50 resize-none"
      />
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
    </div>
  );
}

function LongTextRenderer({
  field,
  value,
  onChange,
  error,
}: FieldRendererProps) {
  const f = field as LongTextField;
  return (
    <div className="space-y-2">
      <Label htmlFor={f.id} className="text-sm font-medium">
        {f.label}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <Textarea
        id={f.id}
        name={f.name}
        placeholder={f.placeholder}
        rows={f.rows || 4}
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

function LongTextSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as LongTextField;
  const update = (updates: Partial<LongTextField>) =>
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
      <div className="space-y-2">
        <Label className="text-xs">Rows</Label>
        <Input
          type="number"
          min={2}
          max={20}
          value={f.rows || 4}
          onChange={(e) =>
            update({ rows: Number.parseInt(e.target.value) || 4 })
          }
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
  type: "long-text",
  label: "Long Text",
  icon: AlignLeft,
  Editor: LongTextEditor,
  Renderer: LongTextRenderer,
  Settings: LongTextSettings,
});

export { LongTextEditor, LongTextRenderer, LongTextSettings };
