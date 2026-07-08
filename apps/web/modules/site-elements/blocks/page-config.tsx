"use client";

import { usePages } from "@/lib/data";
import { useEditorUi } from "@/modules/editor/state";
import { useEditorSite } from "@/modules/editor/state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageBlockContent } from "@baseblocks/domain/elements";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation } from "convex/react";
import type { ElementConfigPanelProps } from "../authoring/registry";

export function PageConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"page">) {
  const { siteId } = useEditorSite();
  const { currentPageId } = useEditorUi();
  const setExposure = useMutation(api.pages.mutations.setExposure);
  const pages = usePages(siteId);

  const availablePages = (pages ?? [])
    .filter((page) => page._id !== currentPageId)
    .sort((a, b) => a.title.localeCompare(b.title));
  const linkedPage = availablePages.find((page) => page._id === content.pageId);

  const updateContent = (partial: Partial<PageBlockContent>) => {
    onUpdate({
      ...content,
      ...partial,
    });
  };

  const handleExposureChange = async (
    exposure: "navigation" | "block" | "both",
  ) => {
    if (!content.pageId) return;
    await setExposure({
      pageId: content.pageId as Id<"pages">,
      exposure,
    });
  };

  const exposure =
    linkedPage?.showInNavigation !== false
      ? linkedPage?.hasPageBlockReference
        ? "both"
        : "navigation"
      : "block";

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Label className="text-sm">Linked Page</Label>
        <Select
          value={content.pageId}
          onValueChange={(value) => updateContent({ pageId: value })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Choose a page" />
          </SelectTrigger>
          <SelectContent>
            {availablePages.map((page) => (
              <SelectItem key={page._id} value={page._id}>
                {page.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {linkedPage && (
        <div className="space-y-2">
          <Label className="text-sm">Show As</Label>
          <Select
            value={exposure}
            onValueChange={(value) =>
              handleExposureChange(value as "navigation" | "block" | "both")
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="navigation">Navigation Only</SelectItem>
              <SelectItem value="block">Page Block Only</SelectItem>
              <SelectItem value="both">Navigation and Block</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
