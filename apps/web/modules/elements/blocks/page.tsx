"use client";
import { usePage } from "@/lib/data";
import { usePublicPagePanelOptional } from "@/modules/public-site/public-page-panel-context";
import { useEditorUiOptional } from "@/modules/shared/contexts/editor-context";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { ChevronRight, FileText } from "lucide-react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";
import { PageConfigPanel } from "./page-config";

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
      <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
        <FileText className="h-5 w-5 shrink-0" />
        <span className="text-sm">Page not configured</span>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors">
      <button
        type="button"
        className="min-w-0 flex flex-1 items-center gap-3 text-left"
        onClick={handleClick}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">
            {page?.title ?? "Loading..."}
          </h3>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </button>
    </div>
  );
}

function PageRenderer({ content }: ElementRendererProps<"page">) {
  const pagePanel = usePublicPagePanelOptional();
  const page = usePage(content.pageId);

  if (!content.pageId || !page) {
    return null;
  }

  const handleClick = () => {
    if (pagePanel) {
      pagePanel.openPage(content.pageId);
    }
  };

  return (
    <div className="not-prose w-full flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors">
      <button
        type="button"
        className="min-w-0 flex flex-1 items-center gap-3 text-left"
        onClick={handleClick}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{page.title}</h3>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
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
