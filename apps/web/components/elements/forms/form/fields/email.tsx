"use client";

import type { EmailField } from "@/types/elements";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail } from "lucide-react";

function EmailEditor({ field }: FieldEditorProps) {
  const f = field as EmailField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label || "Email"}
        {f.validation?.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        type="email"
        placeholder={f.placeholder || "email@example.com"}
        disabled
        className="bg-muted/50"
      />
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
    </div>
  );
}

function EmailRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const f = field as EmailField;
  return (
    <div className="space-y-2">
      <Label htmlFor={f.id} className="text-sm font-medium">
        {f.label}
        {f.validation?.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={f.id}
        name={f.name}
        type="email"
        placeholder={f.placeholder}
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

function EmailSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as EmailField;
  const update = (updates: Partial<EmailField>) => onChange({ ...f, ...updates });

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
  type: "email",
  label: "Email",
  icon: Mail,
  Editor: EmailEditor,
  Renderer: EmailRenderer,
  Settings: EmailSettings,
});

export { EmailEditor, EmailRenderer, EmailSettings };
