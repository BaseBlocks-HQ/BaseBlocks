"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DiagramViewer } from "@/components/elements/blocks/flowchart/diagram-viewer";
import type { FlowchartDiagram } from "@/types/elements/blocks";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { usePublicSubpageContext } from "./public-subpage-context";
import { PublicSubpageBlockViewer } from "./public-subpage-block-viewer";
import type { Block } from "@blocknote/core";
import { useMemo } from "react";

interface PublicSubpagePanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function getDiagrams(content: { mermaidCode?: string; diagrams?: FlowchartDiagram[] }): FlowchartDiagram[] {
  if (content.diagrams && content.diagrams.length > 0) {
    return content.diagrams;
  }
  if (content.mermaidCode?.trim()) {
    return [{ id: "default", label: "Diagram", mermaidCode: content.mermaidCode }];
  }
  return [];
}

export function PublicSubpagePanel({ isFullscreen, onToggleFullscreen }: PublicSubpagePanelProps) {
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();

  const viewerKey = useMemo(() => {
    if (!viewingSubpage) return "";
    const { content } = viewingSubpage;
    return `${content.title || ""}-${Array.isArray(content.content) ? content.content.length : 0}-${Date.now()}`;
  }, [viewingSubpage]);

  const diagrams = useMemo(
    () => (viewingSubpage ? getDiagrams(viewingSubpage.content) : []),
    [viewingSubpage],
  );

  if (!viewingSubpage) return null;

  const { content } = viewingSubpage;
  const hasDiagrams = diagrams.length > 0;

  return (
    <div className="h-full min-w-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="font-semibold text-lg break-words">
            {content.title || "Untitled"}
          </h2>
          {content.description && (
            <p className="text-sm text-muted-foreground break-words">
              {content.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" onClick={onToggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={closeSubpage}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {hasDiagrams ? (
        <Tabs defaultValue="content" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0 mx-6 mt-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="diagram">
              Diagram{diagrams.length > 1 ? "s" : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
            <PublicSubpageBlockViewer
              key={viewerKey}
              content={content.content as Block[] | undefined}
              searchTerm={viewingSubpage.searchTerm}
            />
          </TabsContent>

          <TabsContent value="diagram" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <DiagramViewer diagrams={diagrams} contained />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
          <PublicSubpageBlockViewer
            key={viewerKey}
            content={content.content as Block[] | undefined}
            searchTerm={viewingSubpage.searchTerm}
          />
        </div>
      )}
    </div>
  );
}
