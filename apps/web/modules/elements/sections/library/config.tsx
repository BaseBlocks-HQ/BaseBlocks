"use client";

import type { ElementConfigPanelProps } from "@/modules/elements/framework/registry";
import { Label } from "@baseblocks/ui/label";
import { Switch } from "@baseblocks/ui/switch";

export function LibraryConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"library">) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Library Settings</h4>

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
