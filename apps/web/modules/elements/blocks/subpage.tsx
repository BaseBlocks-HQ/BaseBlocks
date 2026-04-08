"use client";
import { usePublicSubpageContextOptional } from "@/modules/public-site/public-subpage-context";
import { useEditorUiOptional } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { useQuery } from "convex/react";
import { ChevronRight, FileText } from "lucide-react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

function SubpageEditor({ content }: ElementEditorProps<"subpage">) {
  const editorUi = useEditorUiOptional();
  const page = useQuery(
    api.pages.queries.get,
    content.pageId ? { pageId: content.pageId as Id<"pages"> } : "skip",
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editorUi || !content.pageId) return;
    editorUi.openSubpageEditor({ pageId: content.pageId });
  };

  if (!content.pageId) {
    return (
      <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
        <FileText className="h-5 w-5 shrink-0" />
        <span className="text-sm">Sub-page not configured</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
      onClick={handleClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{page?.title ?? "Loading..."}</h3>
        <p className="text-sm text-muted-foreground">Click to edit sub-page</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}

function SubpageRenderer({ content }: ElementRendererProps<"subpage">) {
  const subpageContext = usePublicSubpageContextOptional();
  const page = useQuery(
    api.pages.queries.get,
    content.pageId ? { pageId: content.pageId as Id<"pages"> } : "skip",
  );

  if (!content.pageId || !page) {
    return null;
  }

  const handleClick = () => {
    if (subpageContext) {
      subpageContext.openSubpage(content.pageId);
    }
  };

  return (
    <button
      type="button"
      className="not-prose w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
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
  );
}

const SubpagePreview = themedPickerImagePreview(
  "/editor/picker/blocks/subpage-light.png",
  "/editor/picker/blocks/subpage-dark.png",
);

registerElement({
  type: "subpage",
  category: "blocks",
  label: "Sub-page",
  description: "Create a linked sub-page that opens in a side panel",
  icon: FileText,
  keywords: ["page", "link", "subpage", "process", "document", "nested"],
  editor: SubpageEditor,
  renderer: SubpageRenderer,
  preview: SubpagePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.subpage,
});
