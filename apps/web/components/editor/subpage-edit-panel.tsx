"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebounceCallback } from "@/hooks";
import type { SubpageContent } from "@/types/elements/blocks";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useEditorContext } from "./editor-context";

export function SubpageEditPanel() {
  const { editingSubpage, closeSubpageEditor, updateEditingSubpageContent } = useEditorContext();
  const updateBlockMutation = useMutation(api.layouts.mutations.updateBlockInSlot);

  const [localTitle, setLocalTitle] = useState(editingSubpage?.content.title || "");
  const [localDescription, setLocalDescription] = useState(editingSubpage?.content.description || "");
  const [localContent, setLocalContent] = useState(editingSubpage?.content.content || "");

  // Sync local state when editingSubpage changes
  useEffect(() => {
    if (editingSubpage) {
      setLocalTitle(editingSubpage.content.title || "");
      setLocalDescription(editingSubpage.content.description || "");
      setLocalContent(editingSubpage.content.content || "");
    }
  }, [editingSubpage?.blockId]);

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (content: SubpageContent) => {
        if (!editingSubpage) return;

        await updateBlockMutation({
          layoutId: editingSubpage.layoutId as Id<"layouts">,
          slotId: editingSubpage.slotId,
          blockId: editingSubpage.blockId,
          content,
        });

        // Update the context so the card preview updates
        updateEditingSubpageContent(content);
      },
      [editingSubpage, updateBlockMutation, updateEditingSubpageContent],
    ),
    500,
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    debouncedSave({ title: newTitle, description: localDescription, content: localContent });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value;
    setLocalDescription(newDescription);
    debouncedSave({ title: localTitle, description: newDescription, content: localContent });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    debouncedSave({ title: localTitle, description: localDescription, content: newContent });
  };

  if (!editingSubpage) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg truncate">
          {localTitle || "Untitled sub-page"}
        </h2>
        <Button variant="ghost" size="icon" onClick={closeSubpageEditor}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="subpage-title">Title</Label>
          <Input
            id="subpage-title"
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="Enter title..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subpage-description">Description</Label>
          <Input
            id="subpage-description"
            value={localDescription}
            onChange={handleDescriptionChange}
            placeholder="Brief description (optional)..."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subpage-content">
            Content
            <span className="text-muted-foreground text-xs ml-2">(TODO: block editor)</span>
          </Label>
          <Textarea
            id="subpage-content"
            value={localContent}
            onChange={handleContentChange}
            placeholder="Write your content here..."
            className="min-h-[300px] resize-none"
          />
        </div>
      </div>
    </div>
  );
}
