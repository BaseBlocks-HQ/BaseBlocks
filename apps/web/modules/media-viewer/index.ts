/**
 * Media Viewer Component
 *
 * An extensible media viewer that supports multiple file types including:
 * - Images (with zoom, pan, rotate)
 * - PDFs (with browser native viewer)
 * - Videos (with playback controls)
 * - Audio (with playback controls)
 * - Text/code files (with syntax highlighting potential)
 *
 * Usage:
 *
 * 1. Wrap your app with MediaViewerProvider:
 *    ```tsx
 *    import { MediaViewerProvider, MediaViewerModal } from "@/modules/media-viewer";
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
 *    import { useMediaViewer } from "@/modules/media-viewer";
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

export {
  MediaViewerProvider,
  useMediaViewer,
} from "./context";

export { MediaViewerModal } from "./media-viewer-modal";
