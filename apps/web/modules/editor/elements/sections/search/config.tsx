"use client";

import type { ElementConfigPanelProps } from "@/modules/editor/elements/framework/registry";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";
import { useState } from "react";

export function SearchConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"search">) {
  const [placeholder, setPlaceholder] = useState(
    content.placeholder || "Search documents...",
  );
  const [maxResults, setMaxResults] = useState(content.maxResults || 10);

  const handlePlaceholderChange = (value: string) => {
    setPlaceholder(value);
    onUpdate({ ...content, placeholder: value });
  };

  const handleMaxResultsChange = (value: number) => {
    setMaxResults(value);
    onUpdate({ ...content, maxResults: value });
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Search Settings</h4>

      <div className="space-y-2">
        <Label htmlFor="placeholder">Placeholder text</Label>
        <Input
          id="placeholder"
          value={placeholder}
          onChange={(e) => handlePlaceholderChange(e.target.value)}
          placeholder="Search documents..."
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-file-type">Show file type icons</Label>
        <Switch
          id="show-file-type"
          checked={content.showFileType ?? true}
          onCheckedChange={(checked) =>
            onUpdate({ ...content, showFileType: checked })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-results">Max results</Label>
        <Input
          id="max-results"
          type="number"
          min={1}
          max={50}
          value={maxResults}
          onChange={(e) => handleMaxResultsChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
