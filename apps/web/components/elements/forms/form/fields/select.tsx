"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FieldOption, SelectField } from "@/types/elements";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";

function SelectEditor({ field }: FieldEditorProps) {
  const f = field as SelectField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label || "Dropdown"}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <span>{f.placeholder || "Select an option..."}</span>
        <ChevronDown className="h-4 w-4" />
      </div>
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
    </div>
  );
}

function SelectRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const f = field as SelectField;
  return (
    <div className="space-y-2">
      <Label htmlFor={f.id} className="text-sm font-medium">
        {f.label}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <Select value={(value as string) || ""} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder={f.placeholder || "Select an option..."} />
        </SelectTrigger>
        <SelectContent>
          {f.options.map((opt) => (
            <SelectItem key={opt.id} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SelectSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as SelectField;
  const update = (updates: Partial<SelectField>) =>
    onChange({ ...f, ...updates });

  const addOption = () => {
    const newOption: FieldOption = {
      id: `opt_${Date.now()}`,
      value: `option_${f.options.length + 1}`,
      label: `Option ${f.options.length + 1}`,
    };
    update({ options: [...f.options, newOption] });
  };

  const updateOption = (id: string, updates: Partial<FieldOption>) => {
    update({
      options: f.options.map((opt) =>
        opt.id === id ? { ...opt, ...updates } : opt,
      ),
    });
  };

  const removeOption = (id: string) => {
    update({ options: f.options.filter((opt) => opt.id !== id) });
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
        <div className="flex items-center justify-between">
          <Label className="text-xs">Options</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addOption}
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {f.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <Input
                className="h-8 text-sm flex-1"
                value={opt.label}
                onChange={(e) =>
                  updateOption(opt.id, {
                    label: e.target.value,
                    value: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                  })
                }
                placeholder="Option label"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeOption(opt.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {f.options.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center">
              No options yet. Click "Add" to create one.
            </p>
          )}
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
  type: "select",
  label: "Dropdown",
  icon: ChevronDown,
  Editor: SelectEditor,
  Renderer: SelectRenderer,
  Settings: SelectSettings,
});

export { SelectEditor, SelectRenderer, SelectSettings };
