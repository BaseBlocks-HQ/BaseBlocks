"use client";

import type { ElementConfigPanelProps } from "@/components/elements/registry";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function LibraryConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"library">) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Library Settings</h4>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-folder-tree" className="text-sm">
          Show folder tree
        </Label>
        <Switch
          id="show-folder-tree"
          checked={content.showFolderTree !== false}
          onCheckedChange={(checked) =>
            onUpdate({ ...content, showFolderTree: checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="allow-downloads" className="text-sm">
            Allow downloads
          </Label>
          <p className="text-xs text-muted-foreground">
            Affects published view
          </p>
        </div>
        <Switch
          id="allow-downloads"
          checked={content.allowDownloads !== false}
          onCheckedChange={(checked) =>
            onUpdate({ ...content, allowDownloads: checked })
          }
        />
      </div>
    </div>
  );
}
