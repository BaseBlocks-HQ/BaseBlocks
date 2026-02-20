/**
 * Media Viewer Component
 *
 * An extensible media viewer that supports multiple file types including:
 * - Images (with zoom, pan, rotate)
 * - PDFs (with browser native viewer)
 * - Videos (with playback controls)
 * - Audio (with playback controls)
 * - Office documents (via Microsoft/Google viewers)
 * - Text/code files (with syntax highlighting potential)
 *
 * Usage:
 *
 * 1. Wrap your app with MediaViewerProvider:
 *    ```tsx
 *    import { MediaViewerProvider, MediaViewerModal } from "@/features/media-viewer";
 *
 *    function App() {
 *      return (
 *        <MediaViewerProvider>
 *          <YourApp />
 *          <MediaViewerModal />
 *        </MediaViewerProvider>
 *      );
 *    }
 *    ```
 *
 * 2. Use the hook to open files:
 *    ```tsx
 *    import { useMediaViewer } from "@/features/media-viewer";
 *
 *    function MyComponent() {
 *      const { openFile } = useMediaViewer();
 *
 *      return (
 *        <button onClick={() => openFile({
 *          url: "https://example.com/file.pdf",
 *          filename: "document.pdf",
 *          contentType: "application/pdf",
 *        })}>
 *          Open PDF
 *        </button>
 *      );
 *    }
 *    ```
 *
 * Adding new viewers:
 * 1. Create a new viewer component in ./viewers/
 * 2. Add it to the viewerRegistry in ./viewers/index.ts
 * 3. The viewer will automatically be used for matching content types
 */

// Context and hooks
export {
  MediaViewerProvider,
  useMediaViewer,
  useMediaViewerOptional,
} from "./context";

// Main modal component
export { MediaViewerModal } from "./media-viewer-modal";

// Types
export type {
  MediaFile,
  ViewerProps,
  ViewerConfig,
  MediaFileType,
} from "./types";
export { getMediaFileType, isViewable, getFileExtension } from "./types";

// Individual viewers (for advanced use cases)
export {
  viewerRegistry,
  getViewer,
  hasViewer,
  ImageViewer,
  PdfViewer,
  VideoViewer,
  AudioViewer,
  TextViewer,
  OfficeViewer,
  UnknownViewer,
} from "./viewers";
