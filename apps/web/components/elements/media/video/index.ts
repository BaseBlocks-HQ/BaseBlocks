/**
 * Video media element (stub)
 * Video player with controls
 */

import { Video } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_MEDIA_CONTENT } from "@/types/elements";
import { VideoPreview } from "./video-preview";

// Export preview component
export { VideoPreview } from "./video-preview";

// Register the element (no editor/renderer yet - stub)
registerElement({
  type: "video",
  category: "media",
  label: "Video",
  description: "Video player with controls",
  icon: Video,
  keywords: ["video", "movie", "player", "media"],
  preview: VideoPreview,
  defaultContent: DEFAULT_MEDIA_CONTENT.video,
});
