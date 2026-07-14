"use client";

import { useRegisterEditorBlockPicker } from "@/features/editor/editor-state";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import {
  createDocument,
  textBlock,
  type OpenEditorAttachmentRuntime,
  type OpenEditorDocument,
  type OpenEditorPageRuntime,
} from "@openeditor/core";
import {
  OpenEditorContent,
  OpenEditorViewer,
  type OpenEditorReactExtension,
  type OpenEditorViewerRenderer,
  useOpenEditorController,
} from "@openeditor/react";
import {
  OpenEditorBlockMenu,
  OpenEditorSelectionBubble,
  OpenEditorSlashMenu,
} from "@openeditor/ui";
import { Pencil, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  readOpenEditorPageTabs,
  updateOpenEditorPageTabs,
  type OpenEditorPageTab,
} from "./page-tabs-model";

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
              className="group/tab flex h-8 shrink-0 items-center rounded-[var(--radius-pill,var(--radius))] transition-colors hover:bg-accent/70 has-[button[data-state=active]]:bg-accent"
              key={tab.id}
            >
              {renamingId === tab.id ? (
                <Input
                  aria-label={`Rename ${tab.label}`}
                  className="mx-1 h-6 w-24 rounded-[var(--radius-pill,max(0px,calc(var(--radius)-4px)))] px-2 py-0 text-sm shadow-none focus-visible:ring-1"
                  onBlur={finishRename}
                  onChange={(event) => setLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") finishRename();
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                  ref={inputRef}
                  value={label}
                />
              ) : (
                <>
                  <TabsTrigger
                    className="h-8 rounded-[var(--radius-pill,var(--radius))] border-transparent bg-transparent px-3 text-sidebar-foreground/60 shadow-none after:hidden hover:text-sidebar-foreground data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-accent-foreground"
                    value={tab.id}
                  >
                    {tab.label}
                  </TabsTrigger>
                  {editable ? (
                    <div className="mr-1 flex w-0 items-center gap-0.5 overflow-hidden opacity-0 transition-[width,opacity] duration-150 group-hover/tab:w-12 group-hover/tab:opacity-100 group-focus-within/tab:w-12 group-focus-within/tab:opacity-100">
                      <Button
                        aria-label={`Rename ${tab.label}`}
                        className="rounded-[var(--radius-pill,max(0px,calc(var(--radius)-4px)))] hover:bg-transparent hover:text-foreground"
                        onClick={() => startRename(tab)}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <Pencil className="size-3" />
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
                        <X className="size-3" />
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
              <Plus className="size-3.5" />
            </Button>
          ) : null}
        </TabsList>
      </Tabs>
    </div>
  );
}

function ActiveTabEditor({
  attachmentRuntime,
  initialDocument,
  extensions,
  pageRuntime,
  onChange,
}: {
  attachmentRuntime?: OpenEditorAttachmentRuntime<File>;
  initialDocument: OpenEditorDocument;
  extensions: readonly OpenEditorReactExtension[];
  pageRuntime: OpenEditorPageRuntime;
  onChange: (document: OpenEditorDocument) => void;
}) {
  const controller = useOpenEditorController({
    initialDocument,
    attachmentRuntime,
    extensions,
    pageRuntime,
    onChange,
  });
  useRegisterEditorBlockPicker(controller);

  return (
    <>
      <OpenEditorContent controller={controller} />
      <OpenEditorBlockMenu controller={controller} />
      <OpenEditorSelectionBubble controller={controller} />
      <OpenEditorSlashMenu controller={controller} />
    </>
  );
}

export function OpenEditorTabbedPage({
  attachmentRuntime,
  initialDocument,
  editable,
  extensions = [],
  pageRuntime,
  renderers,
  onChange,
}: {
  attachmentRuntime?: OpenEditorAttachmentRuntime<File>;
  initialDocument: OpenEditorDocument;
  editable: boolean;
  extensions?: readonly OpenEditorReactExtension[];
  pageRuntime: OpenEditorPageRuntime;
  renderers?: Partial<Record<string, OpenEditorViewerRenderer>>;
  onChange?: (document: OpenEditorDocument) => void;
}) {
  const [currentDocument, setCurrentDocument] = useState(initialDocument);
  const value = readOpenEditorPageTabs(currentDocument);
  const [activeId, setActiveId] = useState(value?.tabs[0]?.id ?? "");
  if (!value) return null;
  const active = value.tabs.find((tab) => tab.id === activeId) ?? value.tabs[0];
  if (!active) return null;

  const updateTabs = (tabs: OpenEditorPageTab[]) => {
    const nextDocument = updateOpenEditorPageTabs(currentDocument, { tabs });
    setCurrentDocument(nextDocument);
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
    updateTabs([...value.tabs, tab]);
    setActiveId(tab.id);
  };
  const removeTab = (id: string) => {
    if (value.tabs.length <= 1) return;
    const index = value.tabs.findIndex((tab) => tab.id === id);
    const tabs = value.tabs.filter((tab) => tab.id !== id);
    if (active.id === id)
      setActiveId(tabs[Math.min(index, tabs.length - 1)]?.id ?? "");
    updateTabs(tabs);
  };

  return (
    <>
      <TabBar
        activeId={active.id}
        editable={editable}
        onActiveIdChange={setActiveId}
        onAdd={addTab}
        onRemove={removeTab}
        onRename={(id, label) =>
          updateTabs(
            value.tabs.map((tab) => (tab.id === id ? { ...tab, label } : tab)),
          )
        }
        tabs={value.tabs}
      />
      {editable ? (
        <ActiveTabEditor
          attachmentRuntime={attachmentRuntime}
          initialDocument={active.document}
          extensions={extensions}
          key={active.id}
          onChange={(nextDocument) => updateActive({ document: nextDocument })}
          pageRuntime={pageRuntime}
        />
      ) : (
        <OpenEditorViewer
          attachmentRuntime={attachmentRuntime}
          className="oe-viewer"
          document={active.document}
          extensions={extensions}
          pageRuntime={pageRuntime}
          renderers={renderers}
        />
      )}
    </>
  );
}
