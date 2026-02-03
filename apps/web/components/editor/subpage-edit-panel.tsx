"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebounceCallback } from "@/hooks";
import type { SubpageContent, BlockNoteDocument } from "@/types/elements/blocks";
import type { AnyContent } from "@/types/elements";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useEditorContext } from "./editor-context";
import { SubpageBlockEditor } from "./subpage-block-editor";
import type { Block } from "@blocknote/core";

export function SubpageEditPanel() {
  const { editingSubpage, closeSubpageEditor, updateEditingSubpageContent, markContentModified } =
    useEditorContext();
  const updateBlockMutation = useMutation(api.layouts.mutations.updateBlockInSlot);

  const [localTitle, setLocalTitle] = useState(editingSubpage?.content.title || "");
  const [localDescription, setLocalDescription] = useState(editingSubpage?.content.description || "");
  const localContentRef = useRef<BlockNoteDocument | undefined>(editingSubpage?.content.content);

  // Sync local state when editingSubpage changes
  useEffect(() => {
    if (editingSubpage) {
      setLocalTitle(editingSubpage.content.title || "");
      setLocalDescription(editingSubpage.content.description || "");
      localContentRef.current = editingSubpage.content.content;
    }
  }, [editingSubpage?.blockId]);

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (content: SubpageContent) => {
        if (!editingSubpage) return;

        // Save directly to the database
        await updateBlockMutation({
          layoutId: editingSubpage.layoutId as Id<"layouts">,
          slotId: editingSubpage.slotId,
          blockId: editingSubpage.blockId,
          content: content as AnyContent,
        });
        markContentModified();

        // Update the context so the card preview updates
        updateEditingSubpageContent(content);
      },
      [editingSubpage, updateBlockMutation, markContentModified, updateEditingSubpageContent]
    ),
    500
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    debouncedSave({ title: newTitle, description: localDescription, content: localContentRef.current });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    debouncedSave({ title: localTitle, description: newDescription, content: localContentRef.current });
  };

  const handleContentChange = (blocks: Block[]) => {
    localContentRef.current = blocks as BlockNoteDocument;
    debouncedSave({ title: localTitle, description: localDescription, content: blocks as BlockNoteDocument });
  };

  if (!editingSubpage) return null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-end p-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={closeSubpageEditor}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4 min-w-0">
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

        <div className="space-y-1.5">
          <Label>Content</Label>
          <SubpageBlockEditor
            key={editingSubpage.blockId}
            initialContent={editingSubpage.content.content as Block[] | undefined}
            onChange={handleContentChange}
          />
        </div>
      </div>
    </div>
  );
}
