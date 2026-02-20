"use client";

import type { ElementConfigPanelProps } from "@/components/elements/registry";
import type {
  BannerContent,
  BannerImportancePreset,
} from "@repo/types/elements";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/radio-group";
import { Separator } from "@repo/ui/separator";
import { Slider } from "@repo/ui/slider";
import { Switch } from "@repo/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

export function BannerConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"banner">) {
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const update = useCallback(
    (partial: Partial<BannerContent>) => {
      onUpdate({ ...content, ...partial });
    },
    [content, onUpdate],
  );

  const updateSettings = useCallback(
    (partial: Partial<BannerContent["settings"]>) => {
      update({ settings: { ...content.settings, ...partial } });
    },
    [content.settings, update],
  );

  const addPreset = () => {
    const newPreset: BannerImportancePreset = {
      id: `preset-${Date.now()}`,
      name: "Custom",
      color: "#6B7280",
      foreground: "#FFFFFF",
    };
    update({
      importancePresets: [...content.importancePresets, newPreset],
    });
    setEditingPresetId(newPreset.id);
  };

  const removePreset = (presetId: string) => {
    update({
      importancePresets: content.importancePresets.filter(
        (p) => p.id !== presetId,
      ),
      // Reset any alerts using this preset to the first preset
      alerts: content.alerts.map((a) =>
        a.importance === presetId
          ? { ...a, importance: content.importancePresets[0]?.id ?? "info" }
          : a,
      ),
    });
    if (editingPresetId === presetId) setEditingPresetId(null);
  };

  const updatePreset = (
    presetId: string,
    updates: Partial<BannerImportancePreset>,
  ) => {
    update({
      importancePresets: content.importancePresets.map((p) =>
        p.id === presetId ? { ...p, ...updates } : p,
      ),
    });
  };

  return (
    <div className="space-y-4 p-1">
      {/* Dismissible */}
      <div className="flex items-center justify-between">
        <Label htmlFor="dismissible" className="text-sm">
          Dismissible
        </Label>
        <Switch
          id="dismissible"
          checked={content.settings.dismissible}
          onCheckedChange={(checked) =>
            updateSettings({ dismissible: checked })
          }
        />
      </div>

      {/* Auto-cycle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="autoCycle" className="text-sm">
            Auto-cycle
          </Label>
          <Switch
            id="autoCycle"
            checked={content.settings.autoCycle}
            onCheckedChange={(checked) =>
              updateSettings({ autoCycle: checked })
            }
          />
        </div>
        {content.settings.autoCycle && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Interval: {(content.settings.cycleIntervalMs / 1000).toFixed(1)}s
            </Label>
            <Slider
              value={[content.settings.cycleIntervalMs]}
              min={2000}
              max={15000}
              step={500}
              onValueChange={([value]) =>
                updateSettings({ cycleIntervalMs: value })
              }
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Scope */}
      <div className="space-y-2">
        <Label className="text-sm">Banner Scope</Label>
        <RadioGroup
          value={content.settings.scope}
          onValueChange={(value) =>
            updateSettings({
              scope: value as BannerContent["settings"]["scope"],
            })
          }
          className="space-y-1.5"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="this-page" id="scope-this" />
            <Label htmlFor="scope-this" className="text-sm font-normal">
              This page only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="site-wide" id="scope-site" />
            <Label htmlFor="scope-site" className="text-sm font-normal">
              Site-wide
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="specific-pages" id="scope-specific" />
            <Label htmlFor="scope-specific" className="text-sm font-normal">
              Specific pages
            </Label>
          </div>
        </RadioGroup>
        {content.settings.scope === "specific-pages" && (
          <p className="text-xs text-muted-foreground">
            Page targeting is configured after deploy via the page tree.
          </p>
        )}
      </div>

      <Separator />

      {/* Importance Presets */}
      <div className="space-y-2">
        <Label className="text-sm">Importance Presets</Label>
        <div className="space-y-2">
          {content.importancePresets.map((preset) => {
            const isEditing = editingPresetId === preset.id;

            if (isEditing) {
              return (
                <div
                  key={preset.id}
                  className="rounded-md border p-2 space-y-2"
                >
                  <Input
                    value={preset.name}
                    onChange={(e) =>
                      updatePreset(preset.id, { name: e.target.value })
                    }
                    placeholder="Preset name"
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <Label className="text-xs whitespace-nowrap">BG</Label>
                      <Input
                        type="color"
                        value={preset.color}
                        onChange={(e) =>
                          updatePreset(preset.id, { color: e.target.value })
                        }
                        className="h-7 w-10 p-0.5 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-1">
                      <Label className="text-xs whitespace-nowrap">Text</Label>
                      <Input
                        type="color"
                        value={preset.foreground}
                        onChange={(e) =>
                          updatePreset(preset.id, {
                            foreground: e.target.value,
                          })
                        }
                        className="h-7 w-10 p-0.5 cursor-pointer"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setEditingPresetId(null)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div key={preset.id} className="flex items-center gap-2 group">
                <button
                  type="button"
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
                  onClick={() => setEditingPresetId(preset.id)}
                >
                  <div
                    className="w-4 h-4 rounded-sm shrink-0"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="text-sm truncate">{preset.name}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => removePreset(preset.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addPreset}
          className="w-full border-dashed text-xs h-7"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Preset
        </Button>
      </div>
    </div>
  );
}
