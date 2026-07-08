import { registerElementRenderer } from "@/modules/site-runtime/registry";
import {
  HeadingRenderer,
  ParagraphRenderer,
  CalloutRenderer,
  DividerRenderer,
  SpacerRenderer,
} from "./blocks/basic-renderers";
import { CodeRenderer } from "./blocks/code-renderer";
import { DecisionTreeRenderer } from "./blocks/decision-tree/renderer";
import { DirectoryRenderer } from "./blocks/directory/renderer";
import { FileRenderer } from "./blocks/file-renderer";
import { FlowchartRenderer } from "./blocks/flowchart/renderer";
import { PageRenderer } from "./blocks/page-renderer";
import { RichTextRenderer } from "./blocks/richtext-renderer";
import { ImageRenderer } from "./media/image/renderer";
import { LibraryRenderer } from "./sections/library/renderer";
import { QuicklinksRenderer } from "./sections/quicklinks/renderer";
import { SearchRenderer } from "./sections/search/renderer";

registerElementRenderer("heading", HeadingRenderer);
registerElementRenderer("paragraph", ParagraphRenderer);
registerElementRenderer("callout", CalloutRenderer);
registerElementRenderer("divider", DividerRenderer);
registerElementRenderer("block-spacer", SpacerRenderer);
registerElementRenderer("code", CodeRenderer);
registerElementRenderer("richtext", RichTextRenderer);
registerElementRenderer("file", FileRenderer);
registerElementRenderer("page", PageRenderer);
registerElementRenderer("directory", DirectoryRenderer);
registerElementRenderer("flowchart", FlowchartRenderer);
registerElementRenderer("decision-tree", DecisionTreeRenderer);
registerElementRenderer("image", ImageRenderer);
registerElementRenderer("search", SearchRenderer);
registerElementRenderer("library", LibraryRenderer);
registerElementRenderer("quicklinks", QuicklinksRenderer);
