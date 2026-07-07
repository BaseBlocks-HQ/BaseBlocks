"use client";

import { type ReactNode, createContext, use, useState } from "react";
import type { MediaFile } from "./types";

interface MediaViewerContextValue {
  /** Currently open file, or null if closed */
  currentFile: MediaFile | null;
  /** Whether the viewer is open */
  isOpen: boolean;
  /** Whether the viewer is in fullscreen mode */
  isFullscreen: boolean;
  /** Toggle fullscreen mode */
  toggleFullscreen: () => void;
  /** Open the viewer with a file */
  openFile: (file: MediaFile) => void;
  /** Close the viewer */
  closeFile: () => void;
  /** Open next file in a list (for gallery mode) */
  files: MediaFile[];
  currentIndex: number;
  setFiles: (files: MediaFile[], startIndex?: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

const MediaViewerContext = createContext<MediaViewerContextValue | null>(null);

export function useMediaViewer() {
  const context = use(MediaViewerContext);
  if (!context) {
    throw new Error("useMediaViewer must be used within a MediaViewerProvider");
  }
  return context;
}

interface MediaViewerProviderProps {
  children: ReactNode;
}

export function MediaViewerProvider({ children }: MediaViewerProviderProps) {
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [files, setFilesState] = useState<MediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isOpen = currentFile !== null;

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const openFile = (file: MediaFile) => {
    setCurrentFile(file);
    setFilesState([file]);
    setCurrentIndex(0);
    setIsFullscreen(false); // Default to side-by-side
  };

  const closeFile = () => {
    setCurrentFile(null);
    setFilesState([]);
    setCurrentIndex(0);
    setIsFullscreen(false);
  };

  const setFiles = (newFiles: MediaFile[], startIndex = 0) => {
    if (newFiles.length === 0) {
      closeFile();
      return;
    }
    setFilesState(newFiles);
    setCurrentIndex(startIndex);
    setCurrentFile(newFiles[startIndex] ?? null);
  };

  const goToNext = () => {
    if (currentIndex < files.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentFile(files[nextIndex] ?? null);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentFile(files[prevIndex] ?? null);
    }
  };

  const hasNext = currentIndex < files.length - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <MediaViewerContext.Provider
      value={{
        currentFile,
        isOpen,
        isFullscreen,
        toggleFullscreen,
        openFile,
        closeFile,
        files,
        currentIndex,
        setFiles,
        goToNext,
        goToPrevious,
        hasNext,
        hasPrevious,
      }}
    >
      {children}
    </MediaViewerContext.Provider>
  );
}
