"use client";
import { usePage } from "@/lib/data";
import { useEditorUiOptional } from "@/modules/editor/app/editor-context";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/domain/elements";
import { ChevronRight, FileText } from "lucide-react";
import type { ElementEditorProps } from "../authoring/registry";
import { registerElement } from "../authoring/registry";
import { themedPickerImagePreview } from "../authoring/themed-picker-image";
import { PageConfigPanel } from "./page-config";
import { PageRenderer } from "./page-renderer";

function PageEditor({ content }: ElementEditorProps<"page">) {
  const editorUi = useEditorUiOptional();
  const page = usePage(content.pageId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editorUi || !content.pageId) return;
    editorUi.openPageEditor({ pageId: content.pageId });
  };

  if (!content.pageId) {
    return (
      <div className="flex w-full items-center gap-2 rounded-md border border-dashed bg-muted/20 px-2.5 py-2 text-muted-foreground">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium">Page not configured</span>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-md border bg-card/70 p-1.5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={handleClick}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-medium">
            {page?.title ?? "Loading..."}
          </h3>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

const PagePreview = themedPickerImagePreview(
  "/editor/picker/blocks/page-light.png",
  "/editor/picker/blocks/page-dark.png",
);

registerElement({
  type: "page",
  category: "blocks",
  label: "Page",
  description: "Reference a page and open it in a panel",
  icon: FileText,
  keywords: ["page", "process", "document", "nested", "panel"],
  editor: PageEditor,
  renderer: PageRenderer,
  preview: PagePreview,
  configPanel: PageConfigPanel,
  defaultContent: DEFAULT_BLOCK_CONTENT.page,
});
