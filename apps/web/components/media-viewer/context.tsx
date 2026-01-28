"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { MediaFile } from "./types";

interface MediaViewerContextValue {
  /** Currently open file, or null if closed */
  currentFile: MediaFile | null;
  /** Whether the viewer is open */
  isOpen: boolean;
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
  const context = useContext(MediaViewerContext);
  if (!context) {
    throw new Error("useMediaViewer must be used within a MediaViewerProvider");
  }
  return context;
}

/**
 * Optional hook that returns null if not in provider
 * Useful for components that may or may not be inside a provider
 */
export function useMediaViewerOptional() {
  return useContext(MediaViewerContext);
}

interface MediaViewerProviderProps {
  children: ReactNode;
}

export function MediaViewerProvider({ children }: MediaViewerProviderProps) {
  const [currentFile, setCurrentFile] = useState<MediaFile | null>(null);
  const [files, setFilesState] = useState<MediaFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const isOpen = currentFile !== null;

  const openFile = useCallback((file: MediaFile) => {
    setCurrentFile(file);
    setFilesState([file]);
    setCurrentIndex(0);
  }, []);

  const closeFile = useCallback(() => {
    setCurrentFile(null);
    setFilesState([]);
    setCurrentIndex(0);
  }, []);

  const setFiles = useCallback((newFiles: MediaFile[], startIndex = 0) => {
    if (newFiles.length === 0) {
      closeFile();
      return;
    }
    setFilesState(newFiles);
    setCurrentIndex(startIndex);
    setCurrentFile(newFiles[startIndex] ?? null);
  }, [closeFile]);

  const goToNext = useCallback(() => {
    if (currentIndex < files.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentFile(files[nextIndex] ?? null);
    }
  }, [currentIndex, files]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentFile(files[prevIndex] ?? null);
    }
  }, [currentIndex, files]);

  const hasNext = currentIndex < files.length - 1;
  const hasPrevious = currentIndex > 0;

  return (
    <MediaViewerContext.Provider
      value={{
        currentFile,
        isOpen,
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
