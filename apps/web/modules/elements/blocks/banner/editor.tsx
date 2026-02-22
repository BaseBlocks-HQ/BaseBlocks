"use client";

import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import type { BannerAlert, BannerContent } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Textarea } from "@baseblocks/ui/textarea";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function BannerEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"banner">) {
  const [localContent, setLocalContent] = useState<BannerContent>(content);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset local state only when block id changes, not on every content update from parent
  useEffect(() => {
    setLocalContent(content);
  }, [id]);

  const updateContent = (newContent: BannerContent) => {
    setLocalContent(newContent);
    onSaveStatusChange?.("pending");
    save(newContent);
  };

  const addAlert = () => {
    const newAlert: BannerAlert = {
      id: `alert-${Date.now()}`,
      title: "New Alert",
      description: "",
      importance: "info",
    };
    const newContent = {
      ...localContent,
      alerts: [...localContent.alerts, newAlert],
    };
    updateContent(newContent);
    setEditingAlertId(newAlert.id);
  };

  const removeAlert = (alertId: string) => {
    const newContent = {
      ...localContent,
      alerts: localContent.alerts.filter((a) => a.id !== alertId),
    };
    updateContent(newContent);
    if (editingAlertId === alertId) {
      setEditingAlertId(null);
    }
  };

  const updateAlert = (alertId: string, updates: Partial<BannerAlert>) => {
    const newContent = {
      ...localContent,
      alerts: localContent.alerts.map((a) =>
        a.id === alertId ? { ...a, ...updates } : a,
      ),
    };
    updateContent(newContent);
  };

  const getPresetForAlert = (alert: BannerAlert) => {
    return (
      localContent.importancePresets.find((p) => p.id === alert.importance) ??
      localContent.importancePresets[0]
    );
  };

  return (
    <div className="space-y-3">
      {/* Empty state */}
      {localContent.alerts.length === 0 && (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-muted-foreground">
            No alerts yet. This banner won't show on the public site until you
            add one.
          </p>
          <Button variant="outline" size="sm" onClick={addAlert}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Alert
          </Button>
        </div>
      )}

      {/* Alert list */}
      {localContent.alerts.map((alert) => {
        const preset = getPresetForAlert(alert);
        const isEditing = editingAlertId === alert.id;

        return (
          <div key={alert.id}>
            {isEditing ? (
              /* Editing mode */
              <div
                className="rounded-lg border-2 border-dashed border-primary/30 p-3 space-y-2"
                style={{ backgroundColor: `${preset?.color}10` }}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={alert.title}
                    onChange={(e) =>
                      updateAlert(alert.id, { title: e.target.value })
                    }
                    placeholder="Alert title..."
                    className="font-semibold text-sm"
                  />
                  <Select
                    value={alert.importance}
                    onValueChange={(value) =>
                      updateAlert(alert.id, { importance: value })
                    }
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {localContent.importancePresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: preset.color }}
                            />
                            {preset.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setEditingAlertId(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  value={alert.description}
                  onChange={(e) =>
                    updateAlert(alert.id, { description: e.target.value })
                  }
                  placeholder="Alert description..."
                  className="text-sm resize-none"
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
                    onClick={() => removeAlert(alert.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              /* Preview mode - clickable to edit */
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-90 flex-1 min-w-0 text-left"
                  style={{
                    backgroundColor: preset?.color ?? "#2563EB",
                    color: preset?.foreground ?? "#FFFFFF",
                  }}
                  onClick={() => setEditingAlertId(alert.id)}
                >
                  <GripVertical className="h-4 w-4 opacity-50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {alert.title || "Untitled Alert"}
                    </div>
                    {alert.description && (
                      <div className="text-xs opacity-80 truncate">
                        {alert.description}
                      </div>
                    )}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeAlert(alert.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add alert button - only shown when there are already alerts */}
      {localContent.alerts.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={addAlert}
          className="w-full border-dashed"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Alert
        </Button>
      )}
    </div>
  );
}
