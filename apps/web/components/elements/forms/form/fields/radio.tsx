"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { FieldOption, RadioField } from "@/types/elements";
import { Circle, GripVertical, Plus, Trash2 } from "lucide-react";
import type {
  FieldEditorProps,
  FieldRendererProps,
  FieldSettingsProps,
} from "../builder/field-registry";
import { registerField } from "../builder/field-registry";

function RadioEditor({ field }: FieldEditorProps) {
  const f = field as RadioField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label || "Radio Group"}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <div className="space-y-2">
        {f.options.length > 0 ? (
          f.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border border-muted-foreground/50" />
              <span className="text-sm text-muted-foreground">{opt.label}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No options configured</p>
        )}
      </div>
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
    </div>
  );
}

function RadioRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const f = field as RadioField;
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {f.label}
        {f.validation?.required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </Label>
      <RadioGroup
        value={(value as string) || ""}
        onValueChange={onChange}
        className="space-y-2"
      >
        {f.options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <RadioGroupItem value={opt.value} id={`${f.id}-${opt.id}`} />
            <Label
              htmlFor={`${f.id}-${opt.id}`}
              className="text-sm cursor-pointer"
            >
              {opt.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {f.description && (
        <p className="text-xs text-muted-foreground">{f.description}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RadioSettings({ field, onChange }: FieldSettingsProps) {
  const f = field as RadioField;
  const update = (updates: Partial<RadioField>) =>
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
  type: "radio",
  label: "Radio",
  icon: Circle,
  Editor: RadioEditor,
  Renderer: RadioRenderer,
  Settings: RadioSettings,
});

export { RadioEditor, RadioRenderer, RadioSettings };
