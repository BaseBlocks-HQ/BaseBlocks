"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DiagramEditor, generateDiagramId } from "@/components/elements/blocks/flowchart/diagram-editor";
import { useDebounceCallbackWithFlush, useSaveStatus } from "@/hooks";
import type {
  BlockNoteDocument,
  FlowchartDiagram,
  SubpageContent,
  TabsDisplayMode,
} from "@/types/elements/blocks";
import type { AnyContent } from "@/types/elements";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation } from "convex/react";
import { X, Maximize2, Minimize2, Loader2, Check, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useEditorContext } from "./editor-context";
import { SubpageBlockEditor } from "./subpage-block-editor";
import type { Block } from "@blocknote/core";

interface SubpageEditPanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function normalizeDiagrams(content: SubpageContent): FlowchartDiagram[] {
  if (content.diagrams && content.diagrams.length > 0) {
    return content.diagrams;
  }
  if (content.mermaidCode?.trim()) {
    return [{ id: generateDiagramId(), label: "Diagram 1", mermaidCode: content.mermaidCode }];
  }
  return [];
}

export function SubpageEditPanel({ isFullscreen, onToggleFullscreen }: SubpageEditPanelProps) {
  const { editingSubpage, closeSubpageEditor, updateEditingSubpageContent } =
    useEditorContext();
  const updateBlockMutation = useMutation(api.layouts.mutations.updateBlockInSlot);
  const { status: saveStatus, markPending, markSaving, markSaved, markError } = useSaveStatus();

  const [localTitle, setLocalTitle] = useState(editingSubpage?.content.title || "");
  const [localDescription, setLocalDescription] = useState(editingSubpage?.content.description || "");
  const [diagrams, setDiagrams] = useState<FlowchartDiagram[]>(() =>
    editingSubpage ? normalizeDiagrams(editingSubpage.content) : [],
  );
  const [diagramTheme, setDiagramTheme] = useState<string | undefined>(
    editingSubpage?.content.diagramTheme,
  );
  const [diagramTabsMode, setDiagramTabsMode] = useState<TabsDisplayMode>(
    editingSubpage?.content.diagramTabsMode ?? "row",
  );
  const localContentRef = useRef<BlockNoteDocument | undefined>(editingSubpage?.content.content);
  const diagramsRef = useRef(diagrams);
  diagramsRef.current = diagrams;
  const diagramThemeRef = useRef<string | undefined>(
    editingSubpage?.content.diagramTheme,
  );
  diagramThemeRef.current = diagramTheme;
  const diagramTabsModeRef = useRef<TabsDisplayMode>(
    editingSubpage?.content.diagramTabsMode ?? "row",
  );
  diagramTabsModeRef.current = diagramTabsMode;

  // Refs to always have the latest values — fixes stale closure bug in buildContent
  const localTitleRef = useRef(localTitle);
  localTitleRef.current = localTitle;
  const localDescriptionRef = useRef(localDescription);
  localDescriptionRef.current = localDescription;

  // Ref for editingSubpage so the save callback always has the latest value
  const editingSubpageRef = useRef(editingSubpage);
  editingSubpageRef.current = editingSubpage;

  useEffect(() => {
    if (editingSubpage) {
      setLocalTitle(editingSubpage.content.title || "");
      setLocalDescription(editingSubpage.content.description || "");
      const normalized = normalizeDiagrams(editingSubpage.content);
      setDiagrams(normalized);
      setDiagramTheme(editingSubpage.content.diagramTheme);
      setDiagramTabsMode(editingSubpage.content.diagramTabsMode ?? "row");
      localContentRef.current = editingSubpage.content.content;
    }
  }, [editingSubpage?.blockId]);

  // Build the full content object from refs — always reads latest values
  const buildContent = useCallback(
    (overrides?: Partial<SubpageContent>): SubpageContent => {
      const d = overrides?.diagrams ?? diagramsRef.current;
      return {
        title: localTitleRef.current,
        description: localDescriptionRef.current,
        content: localContentRef.current,
        mermaidCode: d[0]?.mermaidCode ?? "",
        diagrams: d.length > 0 ? d : undefined,
        diagramTheme: diagramThemeRef.current,
        diagramTabsMode: diagramTabsModeRef.current,
        ...overrides,
      };
    },
    [], // No deps — reads everything from refs
  );

  const saveToDb = useCallback(
    async (content: SubpageContent) => {
      const subpage = editingSubpageRef.current;
      if (!subpage) return;
      markSaving();
      try {
        await updateBlockMutation({
          layoutId: subpage.layoutId as Id<"layouts">,
          slotId: subpage.slotId,
          blockId: subpage.blockId,
          content: content as AnyContent,
        });
        updateEditingSubpageContent(content);
        markSaved();
      } catch (err) {
        console.error("Failed to save subpage content:", err);
        markError();
      }
    },
    [updateBlockMutation, updateEditingSubpageContent, markSaving, markSaved, markError],
  );

  const { debouncedCallback: debouncedSave, flush } = useDebounceCallbackWithFlush(
    saveToDb,
    500,
  );

  // Flush pending saves on beforeunload (tab close / refresh)
  useEffect(() => {
    const handleBeforeUnload = () => flush();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flush]);

  const handleClose = useCallback(() => {
    // Flush any pending save BEFORE clearing state
    flush();
    closeSubpageEditor();
  }, [flush, closeSubpageEditor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    localTitleRef.current = newTitle;
    markPending();
    debouncedSave(buildContent({ title: newTitle }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    localDescriptionRef.current = newDescription;
    markPending();
    debouncedSave(buildContent({ description: newDescription }));
  };

  const handleContentChange = (blocks: Block[]) => {
    localContentRef.current = blocks as BlockNoteDocument;
    markPending();
    debouncedSave(buildContent({ content: blocks as BlockNoteDocument }));
  };

  const handleDiagramsChange = (updated: FlowchartDiagram[]) => {
    setDiagrams(updated);
    diagramsRef.current = updated;
    markPending();
    debouncedSave(
      buildContent({ diagrams: updated, mermaidCode: updated[0]?.mermaidCode ?? "" }),
    );
  };

  const handleDiagramThemeChange = (newTheme: string | undefined) => {
    setDiagramTheme(newTheme);
    diagramThemeRef.current = newTheme;
    markPending();
    debouncedSave(buildContent({ diagramTheme: newTheme }));
  };

  const handleDiagramTabsModeChange = (mode: TabsDisplayMode) => {
    setDiagramTabsMode(mode);
    diagramTabsModeRef.current = mode;
    markPending();
    debouncedSave(buildContent({ diagramTabsMode: mode }));
  };

  if (!editingSubpage) return null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0 gap-1 border-b">
        <SaveStatusIndicator status={saveStatus} />
        <div className="flex items-center gap-1">
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" onClick={onToggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="px-4 pt-4 space-y-4 shrink-0">
        <div className="space-y-1.5">
          <Label htmlFor="subpage-title">Title</Label>
          <Textarea
            id="subpage-title"
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="Enter title..."
            rows={1}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subpage-description">Description</Label>
          <Textarea
            id="subpage-description"
            value={localDescription}
            onChange={handleDescriptionChange}
            placeholder="Brief description (optional)..."
            rows={2}
          />
        </div>
      </div>

      {/* Tabbed Content / Diagrams */}
      <Tabs defaultValue="content" className="flex-1 min-h-0 flex flex-col px-4 pt-4 pb-4">
        <TabsList className="shrink-0 w-fit max-w-full overflow-x-auto">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="diagram">
            Diagram{diagrams.length > 1 ? "s" : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <SubpageBlockEditor
            key={editingSubpage.blockId}
            initialContent={editingSubpage.content.content as Block[] | undefined}
            onChange={handleContentChange}
          />
        </TabsContent>

        <TabsContent value="diagram" className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden space-y-3">
          <div className="flex items-center justify-end">
            <Select
              value={diagramTabsMode}
              onValueChange={(value) =>
                handleDiagramTabsModeChange(value as TabsDisplayMode)
              }
            >
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="row">Tabs: Horizontal Row</SelectItem>
                <SelectItem value="dropdown">Tabs: Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DiagramEditor
            diagrams={diagrams}
            onChange={handleDiagramsChange}
            allowEmpty
            contained
            tabsMode={diagramTabsMode}
            theme={diagramTheme}
            onThemeChange={handleDiagramThemeChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: string }) {
  if (status === "idle") return <div className="w-4" />;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === "pending" && (
        <>
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          <span>Unsaved</span>
        </>
      )}
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  );
}
