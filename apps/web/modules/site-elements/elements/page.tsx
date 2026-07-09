"use client";
import { getStoredAccessSessionTokens } from "@/modules/public-site/access-session";
import { useSiteRenderActions } from "@/modules/site-runtime/actions";
import { useEditorUiOptional } from "@/modules/editor/editor-state";
import { useEditorSite, useEditorUi } from "@/modules/editor/editor-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageContent } from "@baseblocks/domain/elements";
import { Label } from "@baseblocks/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation, useQuery } from "convex/react";
import { ChevronRight, FileText } from "lucide-react";
import type {
  ElementConfigPanelProps,
  ElementEditorProps,
  ElementRendererProps,
} from "../registry";

export function PageEditor({ content }: ElementEditorProps<"page">) {
  const editorUi = useEditorUiOptional();
  const sessionTokens = getStoredAccessSessionTokens();
  const page = useQuery(
    api.pages.queries.get,
    content.pageId
      ? { pageId: content.pageId as Id<"pages">, sessionTokens }
      : "skip",
  );

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

export function PageRenderer({ content }: ElementRendererProps<"page">) {
  const actions = useSiteRenderActions();
  const sessionTokens = getStoredAccessSessionTokens();
  const page = useQuery(
    api.pages.queries.get,
    content.pageId
      ? { pageId: content.pageId as Id<"pages">, sessionTokens }
      : "skip",
  );

  if (!content.pageId || !page) {
    return null;
  }

  const handleClick = () => {
    actions.openPage?.(content.pageId);
  };

  return (
    <div className="not-prose flex w-full items-center gap-2 rounded-md border bg-card/70 p-1.5 transition-colors hover:border-primary/30 hover:bg-primary/5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={handleClick}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-medium">{page.title}</h3>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

export function PageConfigPanel({
  content,
  onUpdate,
}: ElementConfigPanelProps<"page">) {
  const { siteId } = useEditorSite();
  const { currentPageId } = useEditorUi();
  const setExposure = useMutation(api.pages.mutations.setExposure);
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });

  const availablePages = (pages ?? [])
    .filter((page) => page._id !== currentPageId)
    .sort((a, b) => a.title.localeCompare(b.title));
  const linkedPage = availablePages.find((page) => page._id === content.pageId);

  const updateContent = (partial: Partial<PageContent>) => {
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
