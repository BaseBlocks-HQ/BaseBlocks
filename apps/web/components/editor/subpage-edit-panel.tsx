"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DiagramEditor, generateDiagramId } from "@/components/elements/blocks/flowchart/diagram-editor";
import { useDebounceCallback } from "@/hooks";
import type { SubpageContent, BlockNoteDocument, FlowchartDiagram } from "@/types/elements/blocks";
import type { AnyContent } from "@/types/elements";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation } from "convex/react";
import { X, Maximize2, Minimize2 } from "lucide-react";
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
  const { editingSubpage, closeSubpageEditor, updateEditingSubpageContent, markContentModified } =
    useEditorContext();
  const updateBlockMutation = useMutation(api.layouts.mutations.updateBlockInSlot);

  const [localTitle, setLocalTitle] = useState(editingSubpage?.content.title || "");
  const [localDescription, setLocalDescription] = useState(editingSubpage?.content.description || "");
  const [diagrams, setDiagrams] = useState<FlowchartDiagram[]>(() =>
    editingSubpage ? normalizeDiagrams(editingSubpage.content) : [],
  );
  const localContentRef = useRef<BlockNoteDocument | undefined>(editingSubpage?.content.content);
  const diagramsRef = useRef(diagrams);
  diagramsRef.current = diagrams;

  useEffect(() => {
    if (editingSubpage) {
      setLocalTitle(editingSubpage.content.title || "");
      setLocalDescription(editingSubpage.content.description || "");
      const normalized = normalizeDiagrams(editingSubpage.content);
      setDiagrams(normalized);
      localContentRef.current = editingSubpage.content.content;
    }
  }, [editingSubpage?.blockId]);

  const buildContent = useCallback(
    (overrides?: Partial<SubpageContent>): SubpageContent => {
      const d = overrides?.diagrams ?? diagramsRef.current;
      return {
        title: localTitle,
        description: localDescription,
        content: localContentRef.current,
        mermaidCode: d[0]?.mermaidCode ?? "",
        diagrams: d.length > 0 ? d : undefined,
        ...overrides,
      };
    },
    [localTitle, localDescription],
  );

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (content: SubpageContent) => {
        if (!editingSubpage) return;
        await updateBlockMutation({
          layoutId: editingSubpage.layoutId as Id<"layouts">,
          slotId: editingSubpage.slotId,
          blockId: editingSubpage.blockId,
          content: content as AnyContent,
        });
        markContentModified();
        updateEditingSubpageContent(content);
      },
      [editingSubpage, updateBlockMutation, markContentModified, updateEditingSubpageContent],
    ),
    500,
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    debouncedSave(buildContent({ title: newTitle }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    debouncedSave(buildContent({ description: newDescription }));
  };

  const handleContentChange = (blocks: Block[]) => {
    localContentRef.current = blocks as BlockNoteDocument;
    debouncedSave(buildContent({ content: blocks as BlockNoteDocument }));
  };

  const handleDiagramsChange = (updated: FlowchartDiagram[]) => {
    setDiagrams(updated);
    diagramsRef.current = updated;
    debouncedSave(
      buildContent({ diagrams: updated, mermaidCode: updated[0]?.mermaidCode ?? "" }),
    );
  };

  if (!editingSubpage) return null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-end p-4 shrink-0 gap-1 border-b">
        {onToggleFullscreen && (
          <Button variant="ghost" size="icon" onClick={onToggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={closeSubpageEditor}>
          <X className="h-4 w-4" />
        </Button>
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
        <TabsList className="shrink-0">
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

        <TabsContent value="diagram" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <DiagramEditor
            diagrams={diagrams}
            onChange={handleDiagramsChange}
            allowEmpty
            contained
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
