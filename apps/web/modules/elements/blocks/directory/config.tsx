"use client";

import type { ElementConfigPanelProps } from "@/modules/elements/registry";
import type { DirectoryContent } from "@baseblocks/types/elements";
import { Label } from "@baseblocks/ui/label";
import { RadioGroup, RadioGroupItem } from "@baseblocks/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Switch } from "@baseblocks/ui/switch";
import { useCallback } from "react";

export function DirectoryConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"directory">) {
  const updateSettings = useCallback(
    (partial: Partial<DirectoryContent["settings"]>) => {
      onUpdate({
        ...content,
        settings: { ...content.settings, ...partial },
      });
    },
    [content, onUpdate],
  );

  return (
    <div className="space-y-4 p-1">
      {/* Copy Mode */}
      <div className="space-y-2">
        <Label className="text-sm">Copy Mode</Label>
        <RadioGroup
          value={content.settings.copyMode}
          onValueChange={(value) =>
            updateSettings({
              copyMode: value as DirectoryContent["settings"]["copyMode"],
            })
          }
          className="space-y-1.5"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="none" id="copy-none" />
            <Label htmlFor="copy-none" className="text-sm font-normal">
              None
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cell" id="copy-cell" />
            <Label htmlFor="copy-cell" className="text-sm font-normal">
              Per Cell
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="row" id="copy-row" />
            <Label htmlFor="copy-row" className="text-sm font-normal">
              Per Row
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Page Size */}
      <div className="space-y-2">
        <Label className="text-sm">Page Size</Label>
        <Select
          value={String(content.settings.pageSize)}
          onValueChange={(value) => updateSettings({ pageSize: Number(value) })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 rows</SelectItem>
            <SelectItem value="10">10 rows</SelectItem>
            <SelectItem value="20">20 rows</SelectItem>
            <SelectItem value="50">50 rows</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Show Search */}
      <div className="flex items-center justify-between">
        <Label htmlFor="showSearch" className="text-sm">
          Show Search
        </Label>
        <Switch
          id="showSearch"
          checked={content.settings.showSearch}
          onCheckedChange={(checked) => updateSettings({ showSearch: checked })}
        />
      </div>
    </div>
  );
}
