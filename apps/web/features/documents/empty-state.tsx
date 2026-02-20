"use client";

import { cn } from "@/lib/utils";
import { FolderOpen, Upload } from "lucide-react";

interface EmptyStateProps {
  type: "library" | "folder" | "files";
  className?: string;
}

export function EmptyState({ type, className }: EmptyStateProps) {
  const content = {
    library: {
      icon: FolderOpen,
      title: "No libraries yet",
      description: "Create a Libraryry to start organizing your files.",
    },
    folder: {
      icon: FolderOpen,
      title: "This folder is empty",
      description: "Add files or create subfolders to organize your documents.",
    },
    files: {
      icon: Upload,
      title: "No files yet",
      description: "Drag and drop files here or click to upload.",
    },
  };

  const { icon: Icon, title, description } = content[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
