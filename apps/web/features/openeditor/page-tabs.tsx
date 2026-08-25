"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Cancel01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createDocument,
  textBlock,
  type OpenEditorAttachmentRuntime,
  type OpenEditorDocument,
  type OpenEditorImageRuntime,
  type OpenEditorPageRuntime,
} from "@openeditor/core";
import {
  OpenEditorContent,
  OpenEditorViewer,
  type OpenEditorReactProps,
  useOpenEditorController,
} from "@openeditor/react";
import {
  OpenEditorBlockMenu,
  OpenEditorSelectionBubble,
  OpenEditorSlashMenu,
  OpenEditorTableMenu,
} from "@openeditor/ui";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  OPEN_EDITOR_PAGE_TAB_QUERY_PARAM,
  readOpenEditorPageTabs,
  resolveOpenEditorPageTabId,
  setOpenEditorPageTabQuery,
  updateOpenEditorPageTabs,
  type OpenEditorPageTab,
} from "./page-tabs-model";
import { useOpenEditorDocumentSync } from "./use-open-editor-document-sync";

function TabBar({
  activeId,
  editable,
  tabs,
  onActiveIdChange,
  onAdd,
  onRemove,
  onRename,
}: {
  activeId: string;
  editable: boolean;
  tabs: OpenEditorPageTab[];
  onActiveIdChange: (id: string) => void;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const startRename = (tab: OpenEditorPageTab) => {
    setLabel(tab.label);
    setRenamingId(tab.id);
    requestAnimationFrame(() => inputRef.current?.select());
  };
  const finishRename = () => {
    if (!renamingId) return;
    const nextLabel = label.trim();
    if (nextLabel) onRename?.(renamingId, nextLabel);
    setRenamingId(null);
  };

  return (
    <div className="mb-8 flex justify-center">
      <Tabs onValueChange={onActiveIdChange} value={activeId}>
        <TabsList className="!h-9 max-w-full justify-start gap-0.5 overflow-x-auto rounded-[var(--radius-pill,calc(var(--radius)+2px))] bg-sidebar/95 p-0.5 text-sidebar-foreground backdrop-blur-md">
          {tabs.map((tab) => (
            <div
              className="group/tab flex h-8 shrink-0 items-center rounded-[var(--radius-pill,var(--radius))] transition-[background-color,box-shadow] hover:bg-accent/70 has-[button[data-state=active]]:bg-accent has-[button[data-state=active]]:shadow-sm"
              key={tab.id}
            >
              {renamingId === tab.id ? (
                <Input
                  aria-label={`Rename ${tab.label}`}
                  className="mx-1 h-6 w-24 rounded-[var(--radius-pill,max(0px,calc(var(--radius)-4px)))] px-2 py-0 text-sm shadow-none focus-visible:ring-1"
                  onBlur={finishRename}
                  onChange={(event) => setLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === "Enter") finishRename();
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                  ref={inputRef}
                  value={label}
                />
              ) : (
                <>
                  <TabsTrigger
                    className="h-8 rounded-[var(--radius-pill,var(--radius))] border-transparent bg-transparent px-3 text-sidebar-foreground/60 !shadow-none after:hidden hover:bg-transparent hover:text-sidebar-foreground data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:!bg-transparent data-[state=active]:!shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-accent-foreground"
                    value={tab.id}
                  >
                    {tab.label}
                  </TabsTrigger>
                  {editable ? (
                    <div className="ml-0 flex w-0 items-center gap-0.5 overflow-hidden opacity-0 transition-[width,margin-left,opacity] duration-150 group-hover/tab:ml-1 group-hover/tab:w-12 group-hover/tab:opacity-100 group-has-[:focus-visible]/tab:ml-1 group-has-[:focus-visible]/tab:w-12 group-has-[:focus-visible]/tab:opacity-100">
                      <Button
                        aria-label={`Rename ${tab.label}`}
                        className="rounded-[var(--radius-pill,max(0px,calc(var(--radius)-4px)))] hover:bg-transparent hover:text-foreground"
                        onClick={() => startRename(tab)}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <HugeiconsIcon
                          icon={PencilEdit01Icon}
                          className="size-3"
                        />
                      </Button>
                      <Button
                        aria-label={`Remove ${tab.label}`}
                        className="rounded-[var(--radius-pill,max(0px,calc(var(--radius)-4px)))] text-muted-foreground hover:bg-transparent hover:text-destructive"
                        disabled={tabs.length <= 1}
                        onClick={() => onRemove?.(tab.id)}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
          {editable ? (
            <Button
              aria-label="Add tab"
              className="size-8 shrink-0 rounded-[var(--radius-pill,var(--radius))] text-muted-foreground hover:bg-accent/70 hover:text-foreground"
              onClick={onAdd}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
            </Button>
          ) : null}
        </TabsList>
      </Tabs>
    </div>
  );
}

function ActiveTabEditor({
  attachmentRuntime,
  imageRuntime,
  initialDocument,
  pageRuntime,
  onChange,
  customBlocks,
}: {
  attachmentRuntime?: OpenEditorAttachmentRuntime<File>;
  imageRuntime?: OpenEditorImageRuntime<File>;
  initialDocument: OpenEditorDocument;
  pageRuntime: OpenEditorPageRuntime;
  onChange: (document: OpenEditorDocument) => void;
  customBlocks?: OpenEditorReactProps["customBlocks"];
}) {
  const onChangeRef = useRef(onChange);
  const locallyEmittedDocumentRef = useRef<OpenEditorDocument | undefined>(
    undefined,
  );
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const handleChange = (nextDocument: OpenEditorDocument) => {
    locallyEmittedDocumentRef.current = nextDocument;
    onChangeRef.current(nextDocument);
  };
  const controller = useOpenEditorController({
    initialDocument,
    attachmentRuntime,
    imageRuntime,
    pageRuntime,
    onChange: handleChange,
    customBlocks,
  });
  useOpenEditorDocumentSync({
    controller,
    document: initialDocument,
    locallyEmittedDocumentRef,
  });
  return (
    <>
      <OpenEditorContent controller={controller} />
      <OpenEditorBlockMenu controller={controller} />
      <OpenEditorSelectionBubble controller={controller} />
      <OpenEditorTableMenu controller={controller} />
      <OpenEditorSlashMenu controller={controller} />
    </>
  );
}

export function OpenEditorTabbedPage({
  attachmentRuntime,
  document,
  imageRuntime,
  editable,
  editorCustomBlocks,
  pageRuntime,
  viewerCustomBlocks,
  onChange,
}: {
  attachmentRuntime?: OpenEditorAttachmentRuntime<File>;
  document: OpenEditorDocument;
  imageRuntime?: OpenEditorImageRuntime<File>;
  editable: boolean;
  editorCustomBlocks?: OpenEditorReactProps["customBlocks"];
  pageRuntime: OpenEditorPageRuntime;
  viewerCustomBlocks?: ComponentProps<typeof OpenEditorViewer>["customBlocks"];
  onChange?: (document: OpenEditorDocument) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = useMemo(() => readOpenEditorPageTabs(document), [document]);
  const tabs = value?.tabs ?? [];
  const requestedTabId = searchParams.get(OPEN_EDITOR_PAGE_TAB_QUERY_PARAM);
  const [activeId, setActiveId] = useState(() =>
    resolveOpenEditorPageTabId(tabs, requestedTabId),
  );
  const replaceTabInUrl = useCallback(
    (id: string) => {
      if (!pathname) return;
      const next = setOpenEditorPageTabQuery(
        new URLSearchParams(searchParams.toString()),
        id,
      );
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );
  useEffect(() => {
    const nextId = resolveOpenEditorPageTabId(tabs, requestedTabId);
    setActiveId(nextId);
    if (requestedTabId && nextId && requestedTabId !== nextId) {
      replaceTabInUrl(nextId);
    }
  }, [requestedTabId, replaceTabInUrl, tabs]);
  if (!value) return null;
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!active) return null;

  const handleActiveIdChange = (id: string) => {
    if (!tabs.some((tab) => tab.id === id)) return;
    setActiveId(id);
    replaceTabInUrl(id);
  };

  const updateTabs = (tabs: OpenEditorPageTab[]) => {
    const nextDocument = updateOpenEditorPageTabs(document, { tabs });
    onChange?.(nextDocument);
  };
  const updateActive = (patch: Partial<OpenEditorPageTab>) =>
    updateTabs(
      value.tabs.map((tab) =>
        tab.id === active.id ? { ...tab, ...patch } : tab,
      ),
    );
  const addTab = () => {
    const tab: OpenEditorPageTab = {
      id: crypto.randomUUID(),
      label: `Tab ${value.tabs.length + 1}`,
      document: createDocument([textBlock("paragraph", "")]),
    };
    updateTabs([...tabs, tab]);
    setActiveId(tab.id);
    replaceTabInUrl(tab.id);
  };
  const removeTab = (id: string) => {
    if (tabs.length <= 1) return;
    const index = tabs.findIndex((tab) => tab.id === id);
    const nextTabs = tabs.filter((tab) => tab.id !== id);
    if (active.id === id)
      handleActiveIdChange(
        nextTabs[Math.min(index, nextTabs.length - 1)]?.id ?? "",
      );
    updateTabs(nextTabs);
  };

  return (
    <>
      <TabBar
        activeId={active.id}
        editable={editable}
        onActiveIdChange={handleActiveIdChange}
        onAdd={addTab}
        onRemove={removeTab}
        onRename={(id, label) =>
          updateTabs(
            tabs.map((tab) => (tab.id === id ? { ...tab, label } : tab)),
          )
        }
        tabs={tabs}
      />
      {editable ? (
        <ActiveTabEditor
          attachmentRuntime={attachmentRuntime}
          customBlocks={editorCustomBlocks}
          imageRuntime={imageRuntime}
          initialDocument={active.document}
          key={active.id}
          onChange={(nextDocument) => updateActive({ document: nextDocument })}
          pageRuntime={pageRuntime}
        />
      ) : (
        <OpenEditorViewer
          attachmentRuntime={attachmentRuntime}
          className="oe-viewer"
          document={active.document}
          imageRuntime={imageRuntime}
          pageRuntime={pageRuntime}
          customBlocks={viewerCustomBlocks}
        />
      )}
    </>
  );
}
