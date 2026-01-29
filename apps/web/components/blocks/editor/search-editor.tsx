"use client";

import { useEditorContext } from "@/components/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { SearchContent } from "@/types";
import { Settings2 } from "lucide-react";
import { useCallback, useState } from "react";
import { SearchBox } from "../shared";
import type { BlockEditorBaseProps } from "../types";

export function SearchEditor({ block, onUpdate }: BlockEditorBaseProps) {
  const content = block.content as SearchContent;
  const { siteId } = useEditorContext();

  const [placeholder, setPlaceholder] = useState(
    content.placeholder || "Search documents...",
  );
  const [showFileType, setShowFileType] = useState(
    content.showFileType ?? true,
  );
  const [maxResults, setMaxResults] = useState(content.maxResults || 10);

  const handleUpdate = useCallback(
    (updates: Partial<SearchContent>) => {
      onUpdate({
        ...content,
        ...updates,
      });
    },
    [content, onUpdate],
  );

  const handlePlaceholderChange = useCallback(
    (value: string) => {
      setPlaceholder(value);
      handleUpdate({ placeholder: value });
    },
    [handleUpdate],
  );

  const handleShowFileTypeChange = useCallback(
    (value: boolean) => {
      setShowFileType(value);
      handleUpdate({ showFileType: value });
    },
    [handleUpdate],
  );

  const handleMaxResultsChange = useCallback(
    (value: number) => {
      setMaxResults(value);
      handleUpdate({ maxResults: value });
    },
    [handleUpdate],
  );

  // Settings button to inject into the search box
  const settingsButton = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
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
              checked={showFileType}
              onCheckedChange={handleShowFileTypeChange}
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
      </PopoverContent>
    </Popover>
  );

  return (
    <SearchBox
      siteId={siteId}
      placeholder={placeholder}
      maxResults={maxResults}
      showFileType={showFileType}
      usePublicQuery={false}
      inputAddon={settingsButton}
    />
  );
}
